import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Spinner, Alert, Form, Table } from 'react-bootstrap';

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
      const { data } = await axios.get('https://messagemaster-api-new.onrender.com/api/admin/storage-usage', config);
      setStorageData(data);
    } catch (err) {
      setError('Failed to load storage usage data.');
    } finally {
      setLoading(false);
    }
  }, []);

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
    
    let confirmMessage = `Are you sure you want to permanently delete all ${cleanupForm.dataType} between ${cleanupForm.fromDate} and ${cleanupForm.toDate}? This action cannot be undone.`;
    if (cleanupForm.dataType === 'users') {
        confirmMessage += "\n\nWARNING: This will also delete all campaigns, tickets, and transactions associated with these users.";
    }

    if (window.confirm(confirmMessage)) {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const config = getAuthHeaders();
            const { data } = await axios.delete('https://messagemaster-api-new.onrender.com/api/data/cleanup', {
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
              <Form onSubmit={handleCleanupSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Data Type to Delete</Form.Label>
                    <Form.Select name="dataType" value={cleanupForm.dataType} onChange={handleCleanupChange}>
                        <option value="campaigns">Campaigns</option>
                        <option value="users">Users (excluding Admin)</option>
                        <option value="transactions">Credit Transactions</option>
                    </Form.Select>
                </Form.Group>
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>From Date</Form.Label>
                      <Form.Control type="date" name="fromDate" value={cleanupForm.fromDate} onChange={handleCleanupChange} required />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>To Date</Form.Label>
                      <Form.Control type="date" name="toDate" value={cleanupForm.toDate} onChange={handleCleanupChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Button variant="danger" type="submit" disabled={loading} className="w-100">
                  {loading ? <Spinner size="sm" /> : `Delete ${cleanupForm.dataType}`}
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
