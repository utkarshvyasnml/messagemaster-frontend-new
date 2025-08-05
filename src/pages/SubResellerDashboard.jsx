import React, { useState, useEffect } from "react";
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

const SubResellerDashboard = ({ currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [credits, setCredits] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "User",
    password: "123456",
    status: "Active",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Fetch Hierarchy Data
  const fetchData = async () => {
    try {
      setLoading(true);

      const [usersRes, creditsRes, campaignsRes] = await Promise.all([
        axios.get("https://messagemaster-backend.onrender.com/api/users", {
          params: {
            role: currentUser.role,
            email: currentUser.email,
          },
        }),
        axios.get("https://messagemaster-backend.onrender.com/api/credits", {
          params: {
            role: currentUser.role,
            email: currentUser.email,
          },
        }),
        axios.get("https://messagemaster-backend.onrender.com/api/campaigns", {
          params: {
            role: currentUser.role,
            email: currentUser.email,
          },
        }),
      ]);

      setUsers(usersRes.data.filter((u) => u.role === "User"));
      setCredits(creditsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (err) {
      console.error("❌ Error loading sub-reseller data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableCredits = credits.reduce(
    (sum, tx) =>
      tx.type === "Added" ? sum + tx.count : sum - tx.count,
    0
  );

  // ✅ Create New User
  const handleCreate = async (e) => {
    e.preventDefault();
    if (availableCredits <= 0) {
      setError("❌ Not enough credits to create new user!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await axios.post("https://messagemaster-backend.onrender.com/api/users", {
        ...newUser,
        createdBy: currentUser.email,
      });

      setSuccess("✅ User created successfully!");
      fetchData();
      setTimeout(() => {
        setShowModal(false);
        setNewUser({
          name: "",
          email: "",
          role: "User",
          password: "123456",
          status: "Active",
        });
      }, 1000);
    } catch (err) {
      console.error("❌ Error creating user:", err);
      setError(err.response?.data?.message || "❌ Error creating user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📊 Sub-Reseller Dashboard</h2>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* ✅ Summary */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Users</h6>
                  <h3>{users.length}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Available Credits</h6>
                  <h3>{availableCredits}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="shadow-sm text-center">
                <Card.Body>
                  <h6>Total Campaigns</h6>
                  <h3>{campaigns.length}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ✅ Users Table */}
          <h4>👤 Users</h4>
          <Table striped bordered hover responsive>
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Credits</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u._id}>
                  <td>{i + 1}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <Badge bg={u.status === "Active" ? "success" : "danger"}>
                      {u.status}
                    </Badge>
                  </td>
                  <td>{u.credits || 0}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button onClick={() => setShowModal(true)} className="mt-3">
            ➕ Add User
          </Button>
        </>
      )}

      {/* ✅ Create User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleCreate}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Create"
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SubResellerDashboard;
