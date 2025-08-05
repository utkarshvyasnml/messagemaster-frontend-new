import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Dropdown, Badge, Spinner, Modal, Button, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Function to load a script dynamically
const loadScript = (src, callback) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (!existingScript) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            if (callback) callback();
        };
        document.head.appendChild(script);
    } else {
        if (callback) callback();
    }
};


const NotificationBell = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // ✅ NEW: Refs to track previous notification count and Tone.js synth
    const prevTotalUnreadRef = useRef(0);
    const synthRef = useRef(null);
    const [isToneLoaded, setIsToneLoaded] = useState(false);

    // ✅ NEW: Load Tone.js library when the component mounts
    useEffect(() => {
        loadScript("https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js", () => {
            setIsToneLoaded(true);
            // Initialize the synth and store it in the ref
            synthRef.current = new window.Tone.Synth().toDestination();
        });
    }, []);

    const fetchAllAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const config = getAuthHeaders();
            if (config.headers) {
                const [announcementsRes, notificationsRes] = await Promise.all([
                    axios.get('https://messagemaster-backend.onrender.com/api/announcements', config),
                    axios.get('https://messagemaster-backend.onrender.com/api/notifications', config)
                ]);
                setAnnouncements(announcementsRes.data);
                setNotifications(notificationsRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch alerts", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllAlerts();
        const interval = setInterval(fetchAllAlerts, 30000);
        return () => clearInterval(interval);
    }, [fetchAllAlerts]);

    const handleViewAnnouncement = (announcement) => {
        setSelectedAnnouncement(announcement);
        setShowModal(true);
    };

    const handleNotificationClick = async (notification) => {
        try {
            await axios.put(`https://messagemaster-backend.onrender.com/api/notifications/${notification._id}/read`, {}, getAuthHeaders());
            
            if (notification.link) {
                navigate(notification.link);
            }
            
            fetchAllAlerts();
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedAnnouncement(null);
    };

    const handleMarkAsRead = async () => {
        if (selectedAnnouncement) {
            try {
                await axios.put(`https://messagemaster-backend.onrender.com/api/announcements/${selectedAnnouncement._id}/seen`, {}, getAuthHeaders());
                fetchAllAlerts();
            } catch (error) {
                console.error("Failed to mark announcement as seen", error);
            }
        }
        setShowModal(false);
        setSelectedAnnouncement(null);
    };

    const handleLinkClick = () => {
        if (selectedAnnouncement && selectedAnnouncement.link) {
            window.open(selectedAnnouncement.link, '_blank', 'noopener,noreferrer');
        }
        handleMarkAsRead();
    };

    const allAlerts = [...announcements, ...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalUnread = announcements.length + notifications.length;

    // ✅ NEW: Effect to play sound when new notifications arrive
    useEffect(() => {
        if (isToneLoaded && totalUnread > prevTotalUnreadRef.current) {
            // Play a C5 note for a short duration
            synthRef.current.triggerAttackRelease("C5", "8n");
        }
        // Update the ref with the new count for the next check
        prevTotalUnreadRef.current = totalUnread;
    }, [totalUnread, isToneLoaded]);

    return (
        <>
            <Dropdown align="end">
                <Dropdown.Toggle variant="secondary" id="dropdown-alerts" className="position-relative bg-transparent border-0 text-dark">
                    <span style={{ fontSize: '1.5rem' }}>🔔</span>
                    {totalUnread > 0 && (
                        <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6em' }}>
                            {totalUnread}
                        </Badge>
                    )}
                </Dropdown.Toggle>

                <Dropdown.Menu style={{ minWidth: '350px', maxHeight: '400px', overflowY: 'auto' }}>
                    <Dropdown.Header>{totalUnread > 0 ? 'New Alerts' : 'No new alerts'}</Dropdown.Header>
                    {loading && <Dropdown.ItemText className="text-center"><Spinner size="sm" /></Dropdown.ItemText>}
                    
                    {!loading && allAlerts.map(alert => (
                        alert.eventType ? (
                            <Dropdown.Item key={alert._id} onClick={() => handleNotificationClick(alert)} as="div" className="p-2 border-bottom">
                                <div className="d-flex flex-column">
                                    <strong className="mb-1">Notification</strong>
                                    <p className="mb-1" style={{ fontSize: '0.9em', whiteSpace: 'normal' }}>{alert.message}</p>
                                    <small className="text-muted">{new Date(alert.createdAt).toLocaleString()}</small>
                                </div>
                            </Dropdown.Item>
                        ) : (
                            <Dropdown.Item key={alert._id} onClick={() => handleViewAnnouncement(alert)} as="div" className="p-2 border-bottom bg-light">
                                <div className="d-flex flex-column">
                                    <strong className="mb-1">📢 {alert.title}</strong>
                                    <p className="mb-1 text-muted" style={{ fontSize: '0.9em', whiteSpace: 'normal' }}>
                                        {alert.message.substring(0, 70)}...
                                    </p>
                                </div>
                            </Dropdown.Item>
                        )
                    ))}
                </Dropdown.Menu>
            </Dropdown>

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
                    <Button variant="success" onClick={handleMarkAsRead}>
                        Mark as Read
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default NotificationBell;
