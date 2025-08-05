import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Card, Spinner, Alert, Modal, Button, Image, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const AnnouncementsHistoryPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    const [showModal, setShowModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const userEmail = JSON.parse(localStorage.getItem("user") || "{}").email;

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const config = getAuthHeaders();
            const { data } = await axios.get('https://messagemaster-backend.onrender.com/api/announcements/history', config);
            setAnnouncements(data);
        } catch (err) {
            setError("Failed to load announcement history.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleViewAnnouncement = (announcement) => {
        setSelectedAnnouncement(announcement);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedAnnouncement(null);
    };

    const handleLinkClick = () => {
        if (selectedAnnouncement && selectedAnnouncement.link) {
            window.open(selectedAnnouncement.link, '_blank', 'noopener,noreferrer');
        }
        handleModalClose();
    };
    
    // Helper to check if the current user has seen a specific announcement
    const hasSeen = (announcement) => {
        return announcement.seenBy.includes(userEmail);
    };

    return (
        <>
            <Container fluid className="mt-4">
                <h2 className="mb-4">📢 All Announcements</h2>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? (
                    <div className="text-center"><Spinner animation="border" /></div>
                ) : (
                    announcements.length > 0 ? announcements.map(ann => (
                        <Card key={ann._id} className="mb-3 shadow-sm">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <Card.Title className="mb-1">{ann.title}</Card.Title>
                                        <Card.Subtitle className="mb-2 text-muted">
                                            Posted on {new Date(ann.createdAt).toLocaleDateString()}
                                        </Card.Subtitle>
                                        <Card.Text>
                                            {ann.message.substring(0, 150)}...
                                        </Card.Text>
                                    </div>
                                    <div className="ms-3 text-end">
                                        {hasSeen(ann) ? (
                                            <Badge bg="success">Viewed</Badge>
                                        ) : (
                                            <Badge bg="primary">New</Badge>
                                        )}
                                    </div>
                                </div>
                            </Card.Body>
                            <Card.Footer className="text-end bg-light">
                                <Button variant="primary" onClick={() => handleViewAnnouncement(ann)}>
                                    View Details
                                </Button>
                            </Card.Footer>
                        </Card>
                    )) : (
                        <Alert variant="info">No announcements have been made yet.</Alert>
                    )
                )}
            </Container>

            {/* Modal for displaying the full announcement */}
            <Modal show={showModal} onHide={handleModalClose} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{selectedAnnouncement?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedAnnouncement?.image && (
                        <Image 
                            src={`https://messagemaster-backend.onrender.com${selectedAnnouncement.image}`} 
                            alt="Announcement" 
                            fluid 
                            className="mb-3 rounded"
                        />
                    )}
                    <p style={{ whiteSpace: 'pre-wrap' }}>{selectedAnnouncement?.message}</p>
                </Modal.Body>
                <Modal.Footer>
                    <small className="text-muted me-auto">
                        Posted on: {new Date(selectedAnnouncement?.createdAt).toLocaleDateString()}
                    </small>
                    {selectedAnnouncement?.link && (
                        <Button variant="primary" onClick={handleLinkClick}>
                            Learn More
                        </Button>
                    )}
                    <Button variant="secondary" onClick={handleModalClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default AnnouncementsHistoryPage;
