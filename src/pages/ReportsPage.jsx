import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Table,
  Badge,
  Form,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Button,
  Pagination,
} from "react-bootstrap";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ FIX: Import the autoTable function directly
import { useNavigate } from "react-router-dom";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const ReportsPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [credits, setCredits] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [usersForFilter, setUsersForFilter] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterCreditType, setFilterCreditType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [creditPage, setCreditPage] = useState(1);
  const creditsPerPage = 10;
  const [campaignPage, setCampaignPage] = useState(1);
  const campaignsPerPage = 10;

  // Summary
  const [summary, setSummary] = useState({
    totalAdded: 0,
    totalRemoved: 0,
    topUsers: [],
    topCampaignTypes: [],
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const config = getAuthHeaders();

      const [creditsRes, campaignsRes, usersRes] = await Promise.all([
        axios.get("https://messagemaster-backend.onrender.com/api/credits", config),
        axios.get("https://messagemaster-backend.onrender.com/api/campaigns", config),
        axios.get("https://messagemaster-backend.onrender.com/api/users", config),
      ]);

      setCredits(creditsRes.data);
      setCampaigns(campaignsRes.data);
      setUsersForFilter(usersRes.data);
      generateSummary(creditsRes.data, campaignsRes.data);
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError("❌ Error loading reports data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userFromStorage = JSON.parse(localStorage.getItem("user"));
    if (userFromStorage) {
        setCurrentUser(userFromStorage);
    } else {
        setError("You must be logged in to view this page.");
        setTimeout(() => navigate("/login"), 2000);
    }
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
        fetchReports();
    }
  }, [currentUser, fetchReports]);

  const generateSummary = (creditsData, campaignsData) => {
    const totalAdded = creditsData
      .filter((c) => c.type === "Added")
      .reduce((sum, c) => sum + c.count, 0);

    const totalRemoved = creditsData
      .filter((c) => c.type === "Removed")
      .reduce((sum, c) => sum + c.count, 0);

    const userCredits = creditsData.reduce((acc, c) => {
      if (c.type === "Removed") {
        acc[c.to] = (acc[c.to] || 0) + c.count;
      }
      return acc;
    }, {});
    const topUsers = Object.entries(userCredits)
      .map(([user, used]) => ({ user, used }))
      .sort((a, b) => b.used - a.used)
      .slice(0, 5);

    const typeUsage = campaignsData.reduce((acc, c) => {
      acc[c.creditType] = (acc[c.creditType] || 0) + c.to.split(",").length;
      return acc;
    }, {});
    const topCampaignTypes = Object.entries(typeUsage)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setSummary({ totalAdded, totalRemoved, topUsers, topCampaignTypes });
  };

  const uniqueCreditTypes = [...new Set(credits.map((c) => c.creditType))];

  const filteredCredits = credits.filter((c) => {
    const created = new Date(c.createdAt);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    const matchesSearch =
      c.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creditType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.reason || "").toLowerCase().includes(searchTerm.toLowerCase());

    return (
      (!from || created >= from) &&
      (!to || created <= to) &&
      (filterUser ? c.to === filterUser : true) &&
      (filterType === "All" ? true : c.type === filterType) &&
      (filterCreditType === "All" ? true : c.creditType === filterCreditType) &&
      matchesSearch
    );
  });

  const filteredCampaigns = campaigns.filter((c) => {
    const created = new Date(c.createdAt);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    const matchesSearch =
      c.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.creditType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.status.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      (!from || created >= from) &&
      (!to || created <= to) &&
      (filterUser ? c.userEmail === filterUser : true) &&
      (filterCreditType === "All" ? true : c.creditType === filterCreditType) &&
      matchesSearch
    );
  });

  const paginatedCredits = filteredCredits.slice(
    (creditPage - 1) * creditsPerPage,
    creditPage * creditsPerPage
  );
  const paginatedCampaigns = filteredCampaigns.slice(
    (campaignPage - 1) * campaignsPerPage,
    campaignPage * campaignsPerPage
  );

  const totalCreditPages = Math.ceil(filteredCredits.length / creditsPerPage);
  const totalCampaignPages = Math.ceil(
    filteredCampaigns.length / campaignsPerPage
  );

  const handleDownloadCreditsPDF = () => {
    const doc = new jsPDF();
    doc.text("Credit Transactions Report", 14, 10);
    // ✅ FIX: Call autoTable as an imported function
    autoTable(doc, {
      startY: 20,
      head: [["#", "User", "Credit Type", "Count", "Type", "Reason", "Time"]],
      body: filteredCredits.map((c, i) => [
        i + 1,
        c.to,
        c.creditType,
        c.count,
        c.type,
        c.reason || "-",
        new Date(c.createdAt).toLocaleString(),
      ]),
    });
    doc.save("credits_report.pdf");
  };

  const handleDownloadCampaignsPDF = () => {
    const doc = new jsPDF();
    doc.text("Campaigns Report", 14, 10);
    // ✅ FIX: Call autoTable as an imported function
    autoTable(doc, {
      startY: 20,
      head: [["#", "User", "Credit Type", "Recipients", "Status", "Created"]],
      body: filteredCampaigns.map((c, i) => [
        i + 1,
        c.userEmail,
        c.creditType,
        c.to.split(",").length,
        c.status,
        new Date(c.createdAt).toLocaleString(),
      ]),
    });
    doc.save("campaigns_report.pdf");
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📊 Reports & Analytics</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* --- Summary Cards --- */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Credits Added</h6>
                  <h3>{summary.totalAdded}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Credits Removed</h6>
                  <h3>{summary.totalRemoved}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h6>Top Users (Used Credits)</h6>
                  {summary.topUsers.length > 0 ? (
                    summary.topUsers.map((u, i) => (
                      <div key={i}>
                        {u.user}: <b>{u.used}</b>
                      </div>
                    ))
                  ) : (
                    <div>No data</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h6>Top Campaign Types</h6>
                  {summary.topCampaignTypes.length > 0 ? (
                    summary.topCampaignTypes.map((t, i) => (
                      <div key={i}>
                        {t.type}: <b>{t.count}</b>
                      </div>
                    ))
                  ) : (
                    <div>No data</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* --- Filters + Search + Download Buttons --- */}
          <Card className="p-3 shadow-sm mb-4">
            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>From Date</Form.Label>
                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>To Date</Form.Label>
                <Form.Control
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Filter by User</Form.Label>
                <Form.Select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <option value="">All Users</option>
                  {usersForFilter.map((user) => (
                    <option key={user._id} value={user.email}>{user.name} ({user.email})</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>Search All</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Col>
            </Row>
            <Row>
              <Col md={3}>
                <Form.Label>Credit Transaction Type</Form.Label>
                <Form.Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Added">Added</option>
                  <option value="Removed">Removed</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>Credit Type</Form.Label>
                <Form.Select
                  value={filterCreditType}
                  onChange={(e) => setFilterCreditType(e.target.value)}
                >
                  <option value="All">All</option>
                  {uniqueCreditTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} className="d-flex align-items-end justify-content-end">
                <CSVLink
                  data={filteredCredits}
                  filename="credits_report.csv"
                  className="btn btn-success me-2"
                >
                  ⬇ Credits CSV
                </CSVLink>
                <Button variant="outline-success" onClick={handleDownloadCreditsPDF} className="me-3">
                  ⬇ Credits PDF
                </Button>

                <CSVLink
                  data={filteredCampaigns}
                  filename="campaigns_report.csv"
                  className="btn btn-primary me-2"
                >
                  ⬇ Campaigns CSV
                </CSVLink>
                <Button variant="outline-primary" onClick={handleDownloadCampaignsPDF}>
                  ⬇ Campaigns PDF
                </Button>
              </Col>
            </Row>
          </Card>

          {/* --- Credit Transactions Table + Pagination --- */}
          <h4 className="mt-5">💳 Credit Transactions</h4>
          <Table striped bordered hover responsive className="mb-2">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Credit Type</th>
                <th>Count</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCredits.length > 0 ? (
                paginatedCredits.map((c, i) => (
                  <tr key={c._id}>
                    <td>{(creditPage - 1) * creditsPerPage + i + 1}</td>
                    <td>{c.to}</td>
                    <td>{c.creditType}</td>
                    <td>{c.count}</td>
                    <td>
                      <Badge bg={c.type === "Added" ? "success" : "danger"}>
                        {c.type}
                      </Badge>
                    </td>
                    <td>{c.reason || "-"}</td>
                    <td>{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    No credit transactions found for the applied filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <Pagination className="justify-content-center">
            {[...Array(totalCreditPages).keys()].map((p) => (
              <Pagination.Item
                key={p + 1}
                active={p + 1 === creditPage}
                onClick={() => setCreditPage(p + 1)}
              >
                {p + 1}
              </Pagination.Item>
            ))}
          </Pagination>

          {/* --- Campaigns Table + Pagination --- */}
          <h4 className="mt-5">📤 Campaigns</h4>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Credit Type</th>
                <th>Recipients</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCampaigns.length > 0 ? (
                paginatedCampaigns.map((c, i) => (
                  <tr key={c._id}>
                    <td>{(campaignPage - 1) * campaignsPerPage + i + 1}</td>
                    <td>{c.userEmail}</td>
                    <td>{c.creditType}</td>
                    <td>{c.to.split(",").length}</td>
                    <td>
                      <Badge
                        bg={
                          c.status === "Submitted"
                            ? "warning"
                            : c.status === "Processing"
                            ? "info"
                            : c.status === "Completed"
                            ? "success"
                            : c.status === "Rejected"
                            ? "danger"
                            : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No campaigns found for the applied filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <Pagination className="justify-content-center">
            {[...Array(totalCampaignPages).keys()].map((p) => (
              <Pagination.Item
                key={p + 1}
                active={p + 1 === campaignPage}
                onClick={() => setCampaignPage(p + 1)}
              >
                {p + 1}
              </Pagination.Item>
            ))}
          </Pagination>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
