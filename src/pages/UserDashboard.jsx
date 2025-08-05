import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Table,
  Badge,
  Spinner,
} from "react-bootstrap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const UserDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [creditsTrend, setCreditsTrend] = useState([]);
  const [campaignTypes, setCampaignTypes] = useState([]);
  const [recentCredits, setRecentCredits] = useState([]);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [stats, setStats] = useState({
    credits: { added: 0, removed: 0 },
    campaigns: { total: 0 },
    ownNumber: "",
  });

  const loggedInUser = JSON.parse(localStorage.getItem("userInfo"));
  const requester = loggedInUser?.email;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [trendRes, campaignTypesRes, creditsRes, campaignsRes, statsRes] =
          await Promise.all([
            axios.get("https://messagemaster-backend.onrender.com/api/analytics/credits-trend", {
              params: { requester, role: "Sub-Reseller" }, // User uses same direct filter
            }),
            axios.get("https://messagemaster-backend.onrender.com/api/analytics/campaign-types", {
              params: { requester, role: "Sub-Reseller" },
            }),
            axios.get("https://messagemaster-backend.onrender.com/api/credits", {
              params: { requester, role: "Sub-Reseller" },
            }),
            axios.get("https://messagemaster-backend.onrender.com/api/campaigns", {
              params: { requester, role: "Sub-Reseller" },
            }),
            axios.get("https://messagemaster-backend.onrender.com/api/analytics", {
              params: { requester, role: "Sub-Reseller" },
            }),
          ]);

        setCreditsTrend(trendRes.data);
        setCampaignTypes(campaignTypesRes.data);

        setRecentCredits(
          creditsRes.data
            .filter((c) => c.to === requester)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );

        setRecentCampaigns(
          campaignsRes.data
            .filter((c) => c.userEmail === requester)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );

        setStats({
          credits: statsRes.data.credits,
          campaigns: statsRes.data.campaigns,
          ownNumber: loggedInUser?.ownNumber || "-",
        });
      } catch (err) {
        console.error("❌ Error loading user dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requester, loggedInUser]);

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📊 User Dashboard</h2>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* ✅ Quick Stats */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Credits</h6>
                  <h3>{stats.credits.added - stats.credits.removed}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Campaigns</h6>
                  <h3>{stats.campaigns.total}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Own Number</h6>
                  <h3>{stats.ownNumber}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ✅ Charts */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="p-3 shadow-sm">
                <h6 className="text-center mb-3">Credits Trend</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={creditsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Added" stroke="#00C49F" />
                    <Line type="monotone" dataKey="Removed" stroke="#FF8042" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="p-3 shadow-sm">
                <h6 className="text-center mb-3">Campaign Types</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={campaignTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* ✅ Recent Campaigns */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h6 className="mb-3">Recent Campaigns</h6>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Recipients</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCampaigns.map((c) => (
                        <tr key={c._id}>
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
                          <td>{new Date(c.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            {/* ✅ Recent Credits */}
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h6 className="mb-3">Recent Credit Transactions</h6>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Credit Type</th>
                        <th>Count</th>
                        <th>Reason</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCredits.map((tx) => (
                        <tr key={tx._id}>
                          <td>
                            <Badge
                              bg={tx.type === "Added" ? "success" : "danger"}
                            >
                              {tx.type}
                            </Badge>
                          </td>
                          <td>{tx.creditType}</td>
                          <td>{tx.count}</td>
                          <td>{tx.reason || "-"}</td>
                          <td>{new Date(tx.createdAt).toLocaleString()}</td>
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

export default UserDashboard;
