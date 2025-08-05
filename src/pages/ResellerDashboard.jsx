import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Spinner,
  Alert,
} from "react-bootstrap";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const ResellerDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [subResellers, setSubResellers] = useState([]);
  const [stats, setStats] = useState({});
  
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "User" });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const config = getAuthHeaders();

      const [usersRes, statsRes] = await Promise.all([
        axios.get("https://messagemaster-backend.onrender.com/api/users", config),
        axios.get("https://messagemaster-backend.onrender.com/api/analytics", config),
      ]);

      const allUsers = usersRes.data;
      setSubResellers(allUsers.filter((u) => u.role === "Sub-Reseller"));
      setUsers(allUsers.filter((u) => u.role === "User"));
      setStats(statsRes.data);
    } catch (err) {
      console.error("❌ Error loading reseller data:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userFromStorage = JSON.parse(localStorage.getItem("user"));
    if (userFromStorage) {
        setCurrentUser(userFromStorage);
    } else {
        setError("Login information not found.");
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);


  const handleCreate = async (e) => {
    e.preventDefault();
    if (!currentUser) {
        setError("Cannot create user: Your login information is missing.");
        return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const payload = { ...newUser, createdBy: currentUser.email, reseller: currentUser.email };
      await axios.post("https://messagemaster-backend.onrender.com/api/users", payload, getAuthHeaders());

      setSuccess(`✅ ${newUser.role} created successfully!`);
      fetchData();
      setTimeout(() => {
        setShowModal(false);
        setNewUser({ name: "", email: "", role: "User" });
        setSuccess("");
      }, 1500);
    } catch (err) {
      console.error("❌ Error creating account:", err);
      setError(err.response?.data?.message || "❌ Error creating account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📊 Reseller Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center"><Spinner animation="border" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3}><Card className="shadow-sm text-center"><Card.Body><h6>Sub-Resellers</h6><h3>{subResellers.length}</h3></Card.Body></Card></Col>
            <Col md={3}><Card className="shadow-sm text-center"><Card.Body><h6>Users</h6><h3>{users.length}</h3></Card.Body></Card></Col>
            <Col md={3}><Card className="shadow-sm text-center"><Card.Body><h6>Credits Added</h6><h3>{stats.credits?.added || 0}</h3></Card.Body></Card></Col>
            <Col md={3}><Card className="shadow-sm text-center"><Card.Body><h6>Total Campaigns</h6><h3>{stats.campaigns?.total || 0}</h3></Card.Body></Card></Col>
          </Row>

          {/* Sub-Resellers Table */}
          <h4>👥 Sub-Resellers</h4>
          <Table striped bordered hover responsive className="mb-4">
            {/* ... table content ... */}
          </Table>

          {/* Users Table */}
          <h4>👤 Users</h4>
          <Table striped bordered hover responsive>
            {/* ... table content ... */}
          </Table>

          <Button onClick={() => setShowModal(true)} className="mt-3">
            ➕ Add Sub-Reseller / User
          </Button>
        </>
      )}

      {/* Create User/Sub-Reseller Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Create Account</Modal.Title></Modal.Header>
        <Modal.Body>
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleCreate}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="User">User</option>
                <option value="Sub-Reseller">Sub-Reseller</option>
              </Form.Select>
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : "Create"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ResellerDashboard;
