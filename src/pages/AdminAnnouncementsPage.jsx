import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Table, Modal, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

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
        title: '', message: '', link: '', expiryDate: '', image: null,
        visibilityType: 'all',
        visibilityTargets: []
    });
    const [users, setUsers] = useState([]);
    const [resellers, setResellers] = useState([]);

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusData, setStatusData] = useState({ seenUsers: [], pendingUsers: [] });
    const [statusLoading, setStatusLoading] = useState(false);
    const [selectedAnnTitle, setSelectedAnnTitle] = useState('');

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const config = getAuthHeaders();
            const { data } = await axios.get('https://messagemaster-backend.onrender.com/api/announcements/all', config);
            setAnnouncements(data);
        } catch (err) {
            setError("Failed to load announcements.");
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        const fetchTargets = async () => {
            try {
                const config = getAuthHeaders();
                const { data: allUsers } = await axios.get('https://messagemaster-backend.onrender.com/api/users', config);
                setUsers(allUsers);
                setResellers(allUsers.filter(u => u.role === 'Reseller'));
            } catch (err) {
                setError("Failed to load users for targeting.");
            }
        };
        fetchAnnouncements();
        fetchTargets();
    }, [fetchAnnouncements]);

    const handleViewStatus = async (announcement) => {
        setStatusLoading(true);
        setShowStatusModal(true);
        setSelectedAnnTitle(announcement.title);
        try {
            const config = getAuthHeaders();
            const { data } = await axios.get(`https://messagemaster-backend.onrender.com/api/announcements/${announcement._id}/status`, config);
            setStatusData(data);
        } catch (err) {
            setError("Failed to load announcement status.");
        } finally {
            setStatusLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prevForm => ({ ...prevForm, [name]: value, visibilityTargets: name === 'visibilityType' ? [] : prevForm.visibilityTargets }));
    };

    const handleMultiSelectChange = (e) => {
        setForm({ ...form, visibilityTargets: Array.from(e.target.selectedOptions, option => option.value) });
    };

    const handleFileChange = (e) => {
        setForm({ ...form, image: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.visibilityType !== 'all' && form.visibilityTargets.length === 0) {
            setError(`Please select at least one ${form.visibilityType}.`);
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('message', form.message);
            formData.append('link', form.link);
            formData.append('expiryDate', form.expiryDate);
            formData.append('visibilityType', form.visibilityType);
            if (form.visibilityType !== 'all') formData.append('visibilityTargets', form.visibilityTargets.join(','));
            if (form.image) formData.append('image', form.image);

            const config = { headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } };
            await axios.post('https://messagemaster-backend.onrender.com/api/announcements', formData, config);
            
            setSuccess("Announcement created successfully!");
            setForm({ title: '', message: '', link: '', expiryDate: '', image: null, visibilityType: 'all', visibilityTargets: [] });
            if (document.getElementById('image-input')) document.getElementById('image-input').value = '';
            fetchAnnouncements();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create announcement.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            try {
                await axios.delete(`https://messagemaster-backend.onrender.com/api/announcements/${id}`, getAuthHeaders());
                fetchAnnouncements();
            } catch (err) {
                setError("Failed to delete announcement.");
            }
        }
    };

    return (
        <>
            <Container fluid className="mt-4">
                <h2 className="mb-4">📢 Announcement Management</h2>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

                {/* ✅ RESTORED: The form for creating announcements is back */}
                <Card className="p-3 mb-4 shadow-sm">
                    <Form onSubmit={handleSubmit}>
                        <h4>Create New Announcement</h4>
                        <hr />
                        <Row>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control type="text" name="title" value={form.title} onChange={handleInputChange} required /></Form.Group></Col>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Expiry Date (Optional)</Form.Label><Form.Control type="date" name="expiryDate" value={form.expiryDate} onChange={handleInputChange} /></Form.Group></Col>
                        </Row>
                        <Form.Group className="mb-3"><Form.Label>Message</Form.Label><Form.Control as="textarea" rows={3} name="message" value={form.message} onChange={handleInputChange} required /></Form.Group>
                        
                        <h4 className="mt-3">Target Audience</h4>
                        <Form.Group className="mb-3">
                            <Form.Label>Send To</Form.Label>
                            <Form.Select name="visibilityType" value={form.visibilityType} onChange={handleInputChange}>
                                <option value="all">All Users</option>
                                <option value="reseller">A Specific Reseller (and their users)</option>
                                <option value="specific">Specific Users</option>
                            </Form.Select>
                        </Form.Group>

                        {form.visibilityType === 'reseller' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Select Reseller</Form.Label>
                                <Form.Select name="visibilityTargets" onChange={(e) => setForm({...form, visibilityTargets: [e.target.value]})}>
                                    <option value="">-- Please select a reseller --</option>
                                    {resellers.map(r => <option key={r._id} value={r.email}>{r.name} ({r.email})</option>)}
                                </Form.Select>
                            </Form.Group>
                        )}

                        {form.visibilityType === 'specific' && (
                            <Form.Group className="mb-3">
                                <Form.Label>Select Users (you can select multiple)</Form.Label>
                                <Form.Select name="visibilityTargets" multiple value={form.visibilityTargets} onChange={handleMultiSelectChange} style={{ height: '150px' }}>
                                    {users.map(u => <option key={u._id} value={u.email}>{u.name} ({u.role})</option>)}
                                </Form.Select>
                            </Form.Group>
                        )}

                        <hr/>
                        <Row>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Link (Optional)</Form.Label><Form.Control type="url" name="link" value={form.link} onChange={handleInputChange} placeholder="https://example.com" /></Form.Group></Col>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Image (Optional)</Form.Label><Form.Control type="file" name="image" id="image-input" onChange={handleFileChange} /></Form.Group></Col>
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
                            <th>Visibility</th>
                            <th>Seen By</th>
                            <th>Expires On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center"><Spinner animation="border" /></td></tr>
                        ) : announcements.map(ann => (
                            <tr key={ann._id}>
                                <td>{ann.title}</td>
                                <td>{ann.message.substring(0, 50)}...</td>
                                <td>
                                    {ann.visibility.type === 'all' && <span className="badge bg-info text-dark">All Users</span>}
                                    {ann.visibility.type === 'reseller' && <span className="badge bg-success">Reseller: {ann.visibility.targets.join(', ')}</span>}
                                    {ann.visibility.type === 'specific' && <span className="badge bg-warning text-dark">{ann.visibility.targets.length} Specific Users</span>}
                                </td>
                                <td>
                                    <Button variant="link" size="sm" onClick={() => handleViewStatus(ann)}>
                                        {ann.seenBy.length} users
                                    </Button>
                                </td>
                                <td>{ann.expiryDate ? new Date(ann.expiryDate).toLocaleDateString() : 'Never'}</td>
                                <td><Button variant="danger" size="sm" onClick={() => handleDelete(ann._id)}>Delete</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Container>

            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Status for: "{selectedAnnTitle}"</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {statusLoading ? (
                        <div className="text-center"><Spinner /></div>
                    ) : (
                        <Row>
                            <Col md={6}>
                                <h5>✅ Seen By ({statusData.seenUsers.length})</h5>
                                <ListGroup variant="flush">
                                    {statusData.seenUsers.length > 0 ? statusData.seenUsers.map(user => (
                                        <ListGroup.Item key={user.email}>
                                            {user.name} <small className="text-muted">({user.email})</small>
                                        </ListGroup.Item>
                                    )) : <ListGroup.Item>No one has seen this yet.</ListGroup.Item>}
                                </ListGroup>
                            </Col>
                            <Col md={6}>
                                <h5>⏳ Pending ({statusData.pendingUsers.length})</h5>
                                <ListGroup variant="flush">
                                    {statusData.pendingUsers.length > 0 ? statusData.pendingUsers.map(user => (
                                        <ListGroup.Item key={user.email}>
                                            {user.name} <small className="text-muted">({user.email})</small>
                                        </ListGroup.Item>
                                    )) : <ListGroup.Item>All targeted users have seen this.</ListGroup.Item>}
                                </ListGroup>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default AdminAnnouncementsPage;
