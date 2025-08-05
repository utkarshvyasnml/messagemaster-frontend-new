import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Spinner, Alert, Form, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const StoragePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storageData, setStorageData] = useState(null);
  const navigate = useNavigate();

  // State for the cleanup form
  const [cleanupForm, setCleanupForm] = useState({
      dataType: 'campaigns',
      fromDate: '',
      toDate: ''
  });

  const fetchStorageUsage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const config = getAuthHeaders();
      // ✅ FIX: Ensure the request is not sent if the user is not logged in
      if (!config.headers) {
          setError("Authentication error. Please log in again.");
          setLoading(false);
          setTimeout(() => navigate("/login"), 2000);
          return;
      }
      const { data } = await axios.get('http://localhost:5001/api/admin/storage-usage', config);
      setStorageData(data);
    } catch (err) {
      // ✅ FIX: Add specific error handling for authentication issues
      if (err.response && err.response.status === 401) {
          setError("Your session has expired. Please log in again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setTimeout(() => navigate("/login"), 2000);
      } else {
         setError('Failed to load storage usage data.');
      }
      console.error("Error fetching storage data:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStorageUsage();
  }, [fetchStorageUsage]);

  const handleCleanupChange = (e) => {
    setCleanupForm({ ...cleanupForm, [e.target.name]: e.target.value });
  };

  const handleCleanupSubmit = async (e) => {
    e.preventDefault();
    if (!cleanupForm.fromDate || !cleanupForm.toDate) {
        setError("Please select both a 'from' and 'to' date for cleanup.");
        return;
    }
    if (window.confirm(`Are you sure you want to permanently delete all ${cleanupForm.dataType} between ${cleanupForm.fromDate} and ${cleanupForm.toDate}? This action cannot be undone.`)) {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const config = getAuthHeaders();
            const { data } = await axios.delete('http://localhost:5001/api/data/cleanup', {
                headers: config.headers,
                data: cleanupForm 
            });
            setSuccess(data.message);
            // Refresh storage data after cleanup
            fetchStorageUsage();
        } catch (err) {
            setError('Failed to perform data cleanup.');
        } finally {
            setLoading(false);
        }
    }
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">💾 Storage Management</h2>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading && !storageData ? (
        <div className="text-center"><Spinner animation="border" /></div>
      ) : storageData && (
        <Row>
          <Col md={4}>
            <Card className="text-center shadow-sm mb-4">
              <Card.Body>
                <Card.Title>🗂️ File Storage</Card.Title>
                <Card.Text className="fs-2 fw-bold">
                  {storageData.fileStorage.megabytes} MB
                </Card.Text>
                <Card.Text className="text-muted">
                  (Creatives, Attachments, etc.)
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center shadow-sm mb-4">
              <Card.Body>
                <Card.Title>🗃️ Database Storage</Card.Title>
                <Card.Text className="fs-2 fw-bold">
                  {storageData.databaseStorage.megabytes} MB
                </Card.Text>
                 <Card.Text className="text-muted">
                  (User Data, Campaigns, etc.)
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
             <Card className="text-center shadow-sm mb-4">
              <Card.Body>
                <Card.Title>📊 Total Storage</Card.Title>
                <Card.Text className="fs-2 fw-bold">
                  {(parseFloat(storageData.fileStorage.megabytes) + parseFloat(storageData.databaseStorage.megabytes)).toFixed(2)} MB
                </Card.Text>
                 <Card.Text className="text-muted">
                  (Total Combined Usage)
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col md={8}>
            <Card className="shadow-sm mb-4">
                <Card.Header as="h5">Database Collection Sizes</Card.Header>
                <Card.Body>
                    <Table striped bordered hover responsive size="sm">
                        <thead>
                            <tr>
                                <th>Collection Name</th>
                                <th>Document Count</th>
                                <th>Storage Size (MB)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storageData?.databaseStorage.collections.map(col => (
                                <tr key={col.name}>
                                    <td>{col.name}</td>
                                    <td>{col.count}</td>
                                    <td>{col.sizeMegabytes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm mb-4 border-danger">
            <Card.Header as="h5" className="bg-danger text-white">Data Cleanup</Card.Header>
            <Card.Body>
              <Card.Text>
                Permanently delete old campaign data to free up space.
              </Card.Text>
              <Form onSubmit={handleCleanupSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>From Date</Form.Label>
                  <Form.Control type="date" name="fromDate" value={cleanupForm.fromDate} onChange={handleCleanupChange} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>To Date</Form.Label>
                  <Form.Control type="date" name="toDate" value={cleanupForm.toDate} onChange={handleCleanupChange} required />
                </Form.Group>
                <Button variant="danger" type="submit" disabled={loading}>
                  {loading ? <Spinner size="sm" /> : "Delete Campaign Data"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StoragePage;
