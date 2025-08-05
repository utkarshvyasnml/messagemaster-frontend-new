import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const ProfilePage = () => {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [credits, setCredits] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("user")) || {};

    // State for Change Password Modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fetchData = useCallback(async () => {
        if (!userId) {
            setError("User ID not found in URL.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const config = getAuthHeaders();

            if (!config.headers) {
                setError("Authentication error. Please log in again.");
                setTimeout(() => navigate("/login"), 2000);
                return;
            }

            // ✅ CHANGED: More efficient data fetching using specific endpoints
            const [userRes, creditsRes, campaignsRes] = await Promise.all([
                axios.get(`https://messagemaster-backend.onrender.com/api/users/profile/${userId}`, config),
                axios.get(`https://messagemaster-backend.onrender.com/api/credits`, config), // Still need all for filtering by email
                axios.get(`https://messagemaster-backend.onrender.com/api/campaigns`, config) // Still need all for filtering by email
            ]);
            
            setUser(userRes.data);
            setCredits(creditsRes.data.filter(c => c.to === userRes.data.email));
            setCampaigns(campaignsRes.data.filter(c => c.userEmail === userRes.data.email));

        } catch (err) {
            if (err.response && err.response.status === 401) {
                setError("Your session has expired. Please log in again.");
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                setError("Failed to fetch user profile data.");
            }
        } finally {
            setLoading(false);
        }
    }, [userId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const config = getAuthHeaders();
            await axios.put('https://messagemaster-backend.onrender.com/api/users/change-password', passwordForm, config);
            setSuccess("Password changed successfully!");
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to change password.");
        } finally {
            setLoading(false);
        }
    };

    const creditDetails = credits.reduce((acc, tx) => {
        if (!acc[tx.creditType]) acc[tx.creditType] = { added: 0, removed: 0 };
        if (tx.type === "Added") acc[tx.creditType].added += tx.count;
        else acc[tx.creditType].removed += tx.count;
        return acc;
    }, {});

    if (loading) {
        return <div className="text-center mt-5"><Spinner animation="border" /></div>;
    }

    if (error) {
        return <Alert variant="danger" className="mt-4">{error}</Alert>;
    }

    if (!user) {
        return <Alert variant="warning" className="mt-4">No user data to display.</Alert>;
    }

    return (
        <>
            <Container fluid className="mt-4">
                <Row className="mb-4 align-items-center">
                    <Col>
                        <h2 className="mb-0">👤 User Profile: {user.name}</h2>
                    </Col>
                    {/* ✅ NEW: Show Change Password button if the profile belongs to the logged-in user */}
                    {currentUser.id === userId && (
                        <Col className="text-end">
                            <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
                                Change Password
                            </Button>
                        </Col>
                    )}
                </Row>

                {success && <Alert variant="success">{success}</Alert>}
                
                <Row>
                    {/* User Details Column */}
                    <Col md={4}>
                        <Card className="shadow-sm mb-4">
                            <Card.Header><h5>Personal Information</h5></Card.Header>
                            <Card.Body>
                                <p><strong>Name:</strong> {user.name}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Role:</strong> {user.role}</p>
                                <p><strong>Status:</strong> <Badge bg={user.status === "Active" ? "success" : "danger"}>{user.status}</Badge></p>
                                <p><strong>Contact Person:</strong> {user.contactPerson || '-'}</p>
                                <p><strong>Mobile:</strong> {user.mobile || '-'}</p>
                            </Card.Body>
                        </Card>
                        <Card className="shadow-sm">
                            <Card.Header><h5>Address Information</h5></Card.Header>
                            <Card.Body>
                                <p><strong>Firm/Company:</strong> {user.firmName || '-'}</p>
                                <p><strong>Address:</strong> {user.address || '-'}</p>
                                <p><strong>City:</strong> {user.city || '-'}</p>
                                <p><strong>State:</strong> {user.state || '-'}</p>
                                <p><strong>Pincode:</strong> {user.pincode || '-'}</p>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Credits and Campaigns Column */}
                    <Col md={8}>
                        <Card className="shadow-sm mb-4">
                            <Card.Header><h5>Credit Balances</h5></Card.Header>
                            <Card.Body>
                                <Table striped bordered hover responsive>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Credit Type</th>
                                            <th>Total Added</th>
                                            <th>Total Used</th>
                                            <th>Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(creditDetails).map(([type, data]) => (
                                            <tr key={type}>
                                                <td>{type}</td>
                                                <td>{data.added}</td>
                                                <td>{data.removed}</td>
                                                <td><strong>{data.added - data.removed}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                        <Card className="shadow-sm">
                            <Card.Header><h5>Recent Campaigns</h5></Card.Header>
                            <Card.Body>
                                 <Table striped bordered hover responsive>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Created At</th>
                                            <th>Type</th>
                                            <th>Recipients</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.slice(0, 10).map(c => (
                                            <tr key={c._id}>
                                                <td>{new Date(c.createdAt).toLocaleString()}</td>
                                                <td>{c.creditType}</td>
                                                <td>{c.to.split(',').length}</td>
                                                <td><Badge bg={c.status === "Completed" ? "success" : "warning"}>{c.status}</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* ✅ NEW: Change Password Modal */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Change Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleChangePassword}>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                required 
                            />
                        </Form.Group>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? <Spinner size="sm" /> : "Update Password"}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default ProfilePage;
