import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Button,
} from "react-bootstrap";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ FIX: Import the function directly
import { useNavigate } from "react-router-dom";
import Announcements from "../components/Announcements"; // ✅ Import the new Announcements component

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [credits, setCredits] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [recentCredits, setRecentCredits] = useState([]);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [creditsTrend, setCreditsTrend] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      // ✅ FIX: Add authentication headers to all API calls
      const config = getAuthHeaders();

      const [usersRes, creditsRes, campaignsRes, trendRes, topUsersRes] =
        await Promise.all([
          axios.get("https://messagemaster-backend.onrender.com/api/users", config),
          axios.get("https://messagemaster-backend.onrender.com/api/credits", config),
          axios.get("https://messagemaster-backend.onrender.com/api/campaigns", config),
          axios.get("https://messagemaster-backend.onrender.com/api/analytics/credits-trend", config),
          axios.get("https://messagemaster-backend.onrender.com/api/analytics/top-users", config),
        ]);

      setUsers(usersRes.data);
      setCredits(creditsRes.data);
      setCampaigns(campaignsRes.data);
      setCreditsTrend(trendRes.data);
      setTopUsers(topUsersRes.data);

      setRecentCredits(
        creditsRes.data
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      );
      setRecentCampaigns(
        campaignsRes.data
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      );

      setLoading(false);
    } catch (err) {
      console.error("❌ Error fetching dashboard data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Stats Summary (Your original logic)
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active").length;
  const blockedUsers = totalUsers - activeUsers;

  const totalCredits = credits.reduce(
    (sum, tx) => (tx.type === "Added" ? sum + tx.count : sum),
    0
  );

  const totalCampaigns = campaigns.length;
  const submittedCampaigns = campaigns.filter(
    (c) => c.status === "Submitted"
  ).length;
  const completedCampaigns = campaigns.filter(
    (c) => c.status === "Completed"
  ).length;

  const totalOwnNumbers = users.filter((u) => u.ownNumber).length;

  // Chart Data: Credits Breakdown (Your original logic)
  const creditTypesData = Object.values(
    credits.reduce((acc, tx) => {
      if (!acc[tx.creditType]) {
        acc[tx.creditType] = { name: tx.creditType, value: 0 };
      }
      acc[tx.creditType].value += tx.type === "Added" ? tx.count : -tx.count;
      return acc;
    }, {})
  );

  // Chart Data: Campaigns by Type (Your original logic)
  const campaignsByType = Object.values(
    campaigns.reduce((acc, c) => {
      if (!acc[c.creditType]) {
        acc[c.creditType] = { name: c.creditType, count: 0 };
      }
      acc[c.creditType].count += 1;
      return acc;
    }, {})
  );

  // ✅ FIX: This function now correctly uses the imported autoTable function
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Admin Dashboard Report", 14, 16);

    const userRows = users.map((u) => [
      u.name,
      u.email,
      u.status,
      u.ownNumber || "-",
    ]);
    
    autoTable(doc, {
      startY: 25,
      head: [["Name", "Email", "Status", "Own Number"]],
      body: userRows,
    });

    doc.save("admin-dashboard-report.pdf");
  };

  return (
    <div className="container mt-4">
      <Announcements /> {/* ✅ Add the Announcements component here */}
      <h2 className="mb-4 d-flex justify-content-between">
        📊 Admin Dashboard
        <div>
          <CSVLink
            data={users}
            filename="dashboard-users.csv"
            className="btn btn-success btn-sm me-2"
          >
            ⬇ Export CSV
          </CSVLink>
          <Button size="sm" variant="danger" onClick={exportPDF}>
            ⬇ Export PDF
          </Button>
        </div>
      </h2>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Users</h6>
                  <h3>{totalUsers}</h3>
                  <Badge bg="success">{activeUsers} Active</Badge>{" "}
                  <Badge bg="danger">{blockedUsers} Blocked</Badge>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Credits</h6>
                  <h3>{totalCredits}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Campaigns</h6>
                  <h3>{totalCampaigns}</h3>
                  <Badge bg="warning">{submittedCampaigns} Submitted</Badge>{" "}
                  <Badge bg="success">{completedCampaigns} Completed</Badge>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Own Numbers Assigned</h6>
                  <h3>{totalOwnNumbers}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row className="mb-4">
            <Col md={6}>
              <Card
                className="shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/analytics")}
              >
                <Card.Body>
                  <h6 className="text-center mb-3">Credits Trend</h6>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={creditsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Added"
                        stroke="#00C49F"
                      />
                      <Line
                        type="monotone"
                        dataKey="Removed"
                        stroke="#FF8042"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card
                className="shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/analytics")}
              >
                <Card.Body>
                  <h6 className="text-center mb-3">Top Users (Credits Used)</h6>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topUsers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="used" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={6}>
              <Card
                className="shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/analytics")}
              >
                <Card.Body>
                  <h6 className="text-center mb-3">Credits Breakdown</h6>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={creditTypesData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={80}
                        label
                      >
                        {creditTypesData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card
                className="shadow-sm"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/analytics")}
              >
                <Card.Body>
                  <h6 className="text-center mb-3">Campaigns by Type</h6>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={campaignsByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Recent Campaigns + Credit Transactions */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h6 className="mb-3">Recent Campaigns</h6>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Type</th>
                        <th>Recipients</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCampaigns.map((c) => (
                        <tr key={c._id}>
                          <td>{c.userEmail}</td>
                          <td>{c.creditType}</td>
                          <td>{c.to.split(",").length}</td>
                          <td>
                            <Badge
                              bg={
                                c.status === "Submitted"
                                  ? "warning"
                                  : c.status === "Completed"
                                  ? "success"
                                  : "secondary"
                              }
                            >
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h6 className="mb-3">Recent Credit Transactions</h6>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Type</th>
                        <th>Credits</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCredits.map((tx) => (
                        <tr key={tx._id}>
                          <td>{tx.to}</td>
                          <td>
                            <Badge
                              bg={tx.type === "Added" ? "success" : "danger"}
                            >
                              {tx.type}
                            </Badge>
                          </td>
                          <td>{tx.count}</td>
                          <td>{tx.reason || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
