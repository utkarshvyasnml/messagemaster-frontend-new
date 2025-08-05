import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const AdminAnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: '',
        message: '',
        link: '',
        expiryDate: '',
        image: null
    });

    const fetchAnnouncements = useCallback(async () => {
        try {
            setLoading(true);
            const config = getAuthHeaders();
            if (!config.headers) {
                setError("You are not logged in. Please log in again.");
                setTimeout(() => navigate("/login"), 2000);
                return;
            }
            const { data } = await axios.get('https://messagemaster-backend.onrender.com/api/announcements/all', config);
            setAnnouncements(data);
        } catch (err) {
            setError("Failed to load announcements.");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleInputChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setForm({ ...form, image: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (value) formData.append(key, value);
            });
            const config = { headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } };
            await axios.post('https://messagemaster-backend.onrender.com/api/announcements', formData, config);
            setSuccess("Announcement created successfully!");
            setForm({ title: '', message: '', link: '', expiryDate: '', image: null });
            if (document.getElementById('image-input')) {
                document.getElementById('image-input').value = ''; // Clear file input
            }
            fetchAnnouncements();
        } catch (err) {
            setError("Failed to create announcement.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this announcement? This cannot be undone.")) {
            try {
                await axios.delete(`https://messagemaster-backend.onrender.com/api/announcements/${id}`, getAuthHeaders());
                fetchAnnouncements();
            } catch (err) {
                setError("Failed to delete announcement.");
            }
        }
    };

    return (
        <Container fluid className="mt-4">
            <h2 className="mb-4">📢 Announcement Management</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="p-3 mb-4 shadow-sm">
                <Form onSubmit={handleSubmit}>
                    <h4>Create New Announcement</h4>
                    <hr />
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Title</Form.Label>
                                <Form.Control type="text" name="title" value={form.title} onChange={handleInputChange} required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Expiry Date (Optional)</Form.Label>
                                <Form.Control type="date" name="expiryDate" value={form.expiryDate} onChange={handleInputChange} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Message</Form.Label>
                        <Form.Control as="textarea" rows={3} name="message" value={form.message} onChange={handleInputChange} required />
                    </Form.Group>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Link (Optional)</Form.Label>
                                <Form.Control type="url" name="link" value={form.link} onChange={handleInputChange} placeholder="https://example.com" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Image (Optional)</Form.Label>
                                <Form.Control type="file" name="image" id="image-input" onChange={handleFileChange} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : "Post Announcement"}
                    </Button>
                </Form>
            </Card>

            <h4 className="mt-5">Existing Announcements</h4>
            <Table striped bordered hover responsive>
                <thead className="table-light">
                    <tr>
                        <th>Title</th>
                        <th>Message</th>
                        <th>Seen By</th>
                        <th>Expires On</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {announcements.map(ann => (
                        <tr key={ann._id}>
                            <td>{ann.title}</td>
                            <td>{ann.message.substring(0, 50)}...</td>
                            <td>{ann.seenBy.length} users</td>
                            <td>{ann.expiryDate ? new Date(ann.expiryDate).toLocaleDateString() : 'Never'}</td>
                            <td>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(ann._id)}>Delete</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

export default AdminAnnouncementsPage;
