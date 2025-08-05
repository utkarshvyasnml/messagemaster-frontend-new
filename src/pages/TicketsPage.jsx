import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Spinner,
  Alert,
  Button,
  Modal,
  Form,
  ListGroup,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const TicketsPage = () => {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // State for forms
  const [newTicket, setNewTicket] = useState({ 
      subject: '', 
      description: '', 
      attachments: [],
      issueType: 'Other',
      relatedCampaign: '',
      relatedUser: '',
      relatedTransaction: ''
  });
  const [newReply, setNewReply] = useState('');
  const [newStatus, setNewStatus] = useState('');
  
  // Data for form dropdowns
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);

  const statusColors = {
    Open: 'success',
    'In Progress': 'primary',
    Resolved: 'info',
    Closed: 'secondary',
    Escalated: 'warning',
  };

  const fetchTicketsAndRelatedData = useCallback(async () => {
    try {
      setLoading(true);
      const config = getAuthHeaders();
      const [ticketsRes, campaignsRes, usersRes, creditsRes] = await Promise.all([
        axios.get('https://messagemaster-backend.onrender.com/api/tickets', config),
        axios.get('https://messagemaster-backend.onrender.com/api/campaigns', config),
        axios.get('https://messagemaster-backend.onrender.com/api/users', config),
        axios.get('https://messagemaster-backend.onrender.com/api/credits', config),
      ]);
      
      setTickets(ticketsRes.data);
      setCampaigns(campaignsRes.data);
      setUsers(usersRes.data);
      setCreditTransactions(creditsRes.data);
      
      if (currentUser?.role === 'Admin') {
          const allUsersRes = await axios.get('https://messagemaster-backend.onrender.com/api/users', { headers: { ...config.headers, 'X-Admin-Fetch': 'true' } });
          setResellers(allUsersRes.data.filter(u => u.role === 'Reseller'));
      }

    } catch (err) {
      setError('Failed to load tickets and related data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchTicketsAndRelatedData();
    } else {
        setError("You must be logged in to view this page.");
        setTimeout(() => navigate("/login"), 2000);
    }
  }, [currentUser, fetchTicketsAndRelatedData, navigate]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(newTicket).forEach(([key, value]) => {
          if (key === 'attachments' && value) {
              for (const file of value) {
                  formData.append('attachments', file);
              }
          } else if (value) {
              formData.append(key, value);
          }
      });

      const config = { headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } };
      await axios.post('https://messagemaster-backend.onrender.com/api/tickets', formData, config);
      setShowCreateModal(false);
      setNewTicket({ subject: '', description: '', attachments: [], issueType: 'Other', relatedCampaign: '', relatedUser: '', relatedTransaction: '' });
      fetchTicketsAndRelatedData();
    } catch (err) {
      setError('Failed to create ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!newReply.trim()) return;
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const { data } = await axios.put(`https://messagemaster-backend.onrender.com/api/tickets/${selectedTicket._id}/reply`, { message: newReply }, config);
      setSelectedTicket(data);
      setNewReply('');
      fetchTicketsAndRelatedData();
    } catch (err) {
      setError('Failed to post reply.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    setLoading(true);
    try {
        const config = getAuthHeaders();
        const { data } = await axios.put(`https://messagemaster-backend.onrender.com/api/tickets/${selectedTicket._id}/status`, { status: newStatus }, config);
        setSelectedTicket(data);
        fetchTicketsAndRelatedData();
    } catch (err) {
        setError('Failed to update status.');
    } finally {
        setLoading(false);
    }
  };

  const handleEscalateTicket = async (ticketId) => {
    if (window.confirm("Are you sure you want to escalate this ticket to the Admin?")) {
        setLoading(true);
        try {
            await axios.put(`https://messagemaster-backend.onrender.com/api/tickets/${ticketId}/escalate`, {}, getAuthHeaders());
            fetchTicketsAndRelatedData();
            if (showViewModal) {
                setShowViewModal(false);
            }
        } catch (err) {
            setError("Failed to escalate ticket.");
        } finally {
            setLoading(false);
        }
    }
  };
  
  const handleAssignTicket = async (ticketId, assigneeEmail) => {
      setLoading(true);
      try {
          const { data } = await axios.put(`https://messagemaster-backend.onrender.com/api/tickets/${ticketId}/assign`, { assignee: assigneeEmail }, getAuthHeaders());
          setSelectedTicket(data);
          fetchTicketsAndRelatedData();
      } catch (err) {
          setError("Failed to assign ticket.");
      } finally {
          setLoading(false);
      }
  };

  // ✅ FIX: This function now correctly constructs the URL for downloading attachments.
  const downloadAttachment = async (filePath) => {
    try {
        // Ensure the URL path starts with a forward slash
        const correctedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
        const response = await axios.get(`https://messagemaster-backend.onrender.com${correctedPath}`, {
            responseType: 'blob',
            ...getAuthHeaders(),
        });
        const filename = filePath.split('/').pop();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url); // Clean up the object URL
    } catch (downloadError) {
        setError('Failed to download attachment.');
        console.error("Download Error:", downloadError);
    }
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setShowViewModal(true);
  };

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">🎫 Support Tickets</h2>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create New Ticket
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <Table striped bordered hover responsive>
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  {currentUser?.role === 'Admin' && <th>User</th>}
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, index) => (
                  <tr key={ticket._id}>
                    <td>{index + 1}</td>
                    {currentUser?.role === 'Admin' && <td>{ticket.userEmail}</td>}
                    <td>{ticket.subject}</td>
                    <td><Badge bg={statusColors[ticket.status] || 'dark'}>{ticket.status}</Badge></td>
                    <td>{ticket.assignedTo || 'Admin'}</td>
                    <td>{new Date(ticket.updatedAt).toLocaleString()}</td>
                    <td>
                      <Button variant="info" size="sm" onClick={() => handleViewTicket(ticket)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Create Ticket Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Create New Ticket</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateTicket}>
            <Form.Group className="mb-3">
              <Form.Label>Issue Type</Form.Label>
              <Form.Select value={newTicket.issueType} onChange={(e) => setNewTicket({ ...newTicket, issueType: e.target.value, relatedCampaign: '', relatedUser: '', relatedTransaction: '' })}>
                  <option value="Other">Other</option>
                  <option value="Campaign">Campaign Issue</option>
                  <option value="User">User Issue</option>
                  <option value="Credits/Debits">Credits/Debits</option>
              </Form.Select>
            </Form.Group>

            {newTicket.issueType === 'Campaign' && (
                <Form.Group className="mb-3">
                    <Form.Label>Select Campaign</Form.Label>
                    <Form.Select value={newTicket.relatedCampaign} onChange={(e) => setNewTicket({ ...newTicket, relatedCampaign: e.target.value })}>
                        <option value="">-- Select a Campaign --</option>
                        {campaigns.map(c => <option key={c._id} value={c._id}>Campaign to {c.to.split(',').length} users on {new Date(c.createdAt).toLocaleDateString()}</option>)}
                    </Form.Select>
                </Form.Group>
            )}
            
            {newTicket.issueType === 'User' && (
                 <Form.Group className="mb-3">
                    <Form.Label>Select User</Form.Label>
                    <Form.Select value={newTicket.relatedUser} onChange={(e) => setNewTicket({ ...newTicket, relatedUser: e.target.value })}>
                        <option value="">-- Select a User --</option>
                        {users.map(u => <option key={u._id} value={u.email}>{u.name} ({u.email})</option>)}
                    </Form.Select>
                </Form.Group>
            )}
            
            {newTicket.issueType === 'Credits/Debits' && (
                 <Form.Group className="mb-3">
                    <Form.Label>Select Transaction</Form.Label>
                    <Form.Select value={newTicket.relatedTransaction} onChange={(e) => setNewTicket({ ...newTicket, relatedTransaction: e.target.value })}>
                        <option value="">-- Select a Transaction --</option>
                        {creditTransactions.map(t => 
                            <option key={t._id} value={t._id}>
                                {t.type} {t.count} credits ({t.creditType}) for {t.to}
                            </option>
                        )}
                    </Form.Select>
                </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control type="text" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={4} value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Attachments (Optional)</Form.Label>
              <Form.Control type="file" multiple onChange={(e) => setNewTicket({ ...newTicket, attachments: e.target.files })} />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner size="sm" /> : "Submit Ticket"}</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* View Ticket Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Ticket Details</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedTicket && (
            <>
              <h5>{selectedTicket.subject}</h5>
              <p><strong>From:</strong> {selectedTicket.userEmail}</p>
              <p><strong>Status:</strong> <Badge bg={statusColors[selectedTicket.status]}>{selectedTicket.status}</Badge></p>
              <hr />
              <div className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '1rem' }}>
                <p style={{whiteSpace: 'pre-wrap'}}>{selectedTicket.description}</p>
                
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div className="mt-3">
                        <h6>Attachments</h6>
                        <ListGroup>
                            {selectedTicket.attachments.map((attachment, index) => (
                                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                                    {attachment.split('/').pop()}
                                    <Button variant="outline-primary" size="sm" onClick={() => downloadAttachment(attachment)}>
                                        Download
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                )}
                
                <hr className="my-3"/>
                <h6>Conversation</h6>
                {selectedTicket.replies.map(reply => (
                  <Card key={reply._id} className={`mb-2 ${reply.userEmail === currentUser.email ? 'ms-auto bg-primary text-white' : 'bg-light'}`} style={{ maxWidth: '80%', float: reply.userEmail === currentUser.email ? 'right' : 'left', clear: 'both' }}>
                    <Card.Body>
                      <Card.Subtitle className={`mb-2 ${reply.userEmail === currentUser.email ? 'text-white-50' : 'text-muted'}`}>
                        <strong>{reply.userEmail === currentUser.email ? "You" : reply.userEmail}</strong> at {new Date(reply.createdAt).toLocaleString()}
                      </Card.Subtitle>
                      {reply.message}
                    </Card.Body>
                  </Card>
                ))}
              </div>
              <hr />
              <Form.Group className="mb-3">
                <Form.Label><strong>Your Reply</strong></Form.Label>
                <Form.Control as="textarea" rows={3} value={newReply} onChange={(e) => setNewReply(e.target.value)} />
              </Form.Group>
              <Button onClick={handleReply} disabled={loading}>Post Reply</Button>
              
              {currentUser?.role === 'Reseller' && selectedTicket.assignedTo === currentUser.email && (
                  <Button variant="warning" className="ms-2" onClick={() => handleEscalateTicket(selectedTicket._id)} disabled={loading}>Escalate to Admin</Button>
              )}

              {currentUser?.role === 'Admin' && (
                <Row className="mt-4 align-items-end">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label><strong>Change Status</strong></Form.Label>
                            <Form.Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                                {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Button variant="secondary" onClick={handleStatusChange} disabled={loading}>Update</Button>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label><strong>Assign To</strong></Form.Label>
                            <Form.Select onChange={e => handleAssignTicket(selectedTicket._id, e.target.value)} value={selectedTicket.assignedTo || ''}>
                                <option value="Admin">Admin</option>
                                {resellers.map(r => <option key={r._id} value={r.email}>{r.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default TicketsPage;
