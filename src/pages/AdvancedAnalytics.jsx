import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
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
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useNavigate } from "react-router-dom";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#aa46be", "#8884d8"];

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [users, setUsers] = useState([]);

  const [creditsTrend, setCreditsTrend] = useState([]);
  const [creditTypeUsage, setCreditTypeUsage] = useState([]);
  const [topCampaignTypes, setTopCampaignTypes] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const navigate = useNavigate();

  // ✅ Load Users for Filtering
  const fetchUsersForFilter = useCallback(async () => {
    try {
      const config = getAuthHeaders();
      const { data } = await axios.get("https://messagemaster-backend.onrender.com/api/users", config);
      setUsers(data.filter((u) => u.status === "Active"));
    } catch (err) {
      console.error("Error loading users for filter:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsersForFilter();
  }, [fetchUsersForFilter]);

  // ✅ Fetch Analytics Data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (filterUser) params.userEmail = filterUser;

      const config = { ...getAuthHeaders(), params };
      
      if (!config.headers) {
          setError("You are not logged in. Please log in again.");
          setLoading(false);
          setTimeout(() => navigate("/login"), 2000);
          return;
      }

      const [trendRes, creditTypesRes, campaignTypesRes, topUsersRes] =
        await Promise.all([
          axios.get("https://messagemaster-backend.onrender.com/api/analytics/credits-trend", config),
          axios.get("https://messagemaster-backend.onrender.com/api/analytics/credit-types", config),
          axios.get("https://messagemaster-backend.onrender.com/api/analytics/campaign-types", config),
          axios.get("https://messagemaster-backend.onrender.com/api/analytics/top-users", config),
        ]);

      setCreditsTrend(trendRes.data);
      setCreditTypeUsage(creditTypesRes.data);
      setTopCampaignTypes(campaignTypesRes.data);
      setTopUsers(topUsersRes.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      if (err.response && err.response.status === 401) {
          setError("Your session has expired. Please log in again.");
          setTimeout(() => navigate("/login"), 2000);
      } else {
          setError("❌ Error loading analytics data.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📊 Advanced Reports & Analytics</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Card className="p-3 shadow-sm mb-4">
        <Row>
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
            <Form.Label>User</Form.Label>
            <Form.Select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u.email}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3} className="d-flex align-items-end">
            <Button variant="primary" onClick={fetchAnalytics} disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : "Load Analytics"}
            </Button>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Row className="mb-4">
            {/* Credits Trend */}
            <Col md={6}>
              <Card className="p-3 shadow-sm">
                <h6 className="text-center mb-3">Credits Trend (Added vs Removed)</h6>
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

            {/* Credit Type Usage */}
            <Col md={6}>
              <Card className="p-3 shadow-sm">
                <h6 className="text-center mb-3">Credit Type Usage</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={creditTypeUsage}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label
                    >
                      {creditTypeUsage.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            {/* Top Campaign Types */}
            <Col md={6}>
              <Card className="p-3 shadow-sm">
                <h6 className="text-center mb-3">Top Campaign Types</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topCampaignTypes}>
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

            {/* Top Users */}
            <Col md={6}>
              <Card className="p-3 shadow-sm">
                <h6 className="text-center mb-3">Top Users (Credits Used)</h6>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="used" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
