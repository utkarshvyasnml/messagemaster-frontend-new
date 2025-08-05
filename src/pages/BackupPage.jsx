import React, { useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { saveAs } from 'file-saver';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const BackupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for the cleanup form
  const [cleanupForm, setCleanupForm] = useState({
      dataType: 'campaigns',
      fromDate: '',
      toDate: ''
  });

  const handleDownloadBackup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const config = getAuthHeaders();
      // Step 1: Tell the server to generate the backup file and give us a link
      const { data } = await axios.post('https://messagemaster-backend.onrender.com/api/backup/generate-download', {}, config);
      
      if (data.downloadUrl) {
          setSuccess('Backup file created. Now downloading...');
          
          // Fetch the file content and use saveAs to force a download
          const downloadResponse = await axios.get(`https://messagemaster-backend.onrender.com${data.downloadUrl}`, {
              ...config,
              responseType: 'blob', // Important: get the response as a file blob
          });

          const filename = data.downloadUrl.split('/').pop(); // Get the filename from the URL
          saveAs(downloadResponse.data, filename); // Trigger the browser's save dialog

          setSuccess('Backup downloaded successfully!');
      }
    } catch (err) {
      setError('Failed to download backup. The file might be too large or a server error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToServer = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const config = getAuthHeaders();
      const { data } = await axios.post('https://messagemaster-backend.onrender.com/api/backup/save-to-server', {}, config);
      setSuccess(data.message);
    } catch (err) {
      setError('Failed to save backup to server.');
    } finally {
      setLoading(false);
    }
  };

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
            const { data } = await axios.delete('https://messagemaster-backend.onrender.com/api/data/cleanup', {
                headers: config.headers,
                data: cleanupForm 
            });
            setSuccess(data.message);
        } catch (err) {
            setError('Failed to perform data cleanup.');
        } finally {
            setLoading(false);
        }
    }
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">🗄️ Backup & Data Management</h2>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Row>
        <Col md={6}>
          <Card className="shadow-sm mb-4">
            <Card.Header as="h5">Full System Backup</Card.Header>
            <Card.Body>
              <Card.Text>
                Create a complete, user-friendly Excel backup of all important data in the system.
              </Card.Text>
              <Button variant="primary" onClick={handleDownloadBackup} disabled={loading} className="me-2">
                {loading ? <Spinner size="sm" /> : "Download Backup (Excel)"}
              </Button>
              <Button variant="secondary" onClick={handleSaveToServer} disabled={loading}>
                {loading ? <Spinner size="sm" /> : "Save Backup to Server"}
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm mb-4 border-danger">
            <Card.Header as="h5" className="bg-danger text-white">Data Cleanup (Permanent)</Card.Header>
            <Card.Body>
              <Card.Text>
                Permanently delete old data to free up space. This action cannot be undone. Please ensure you have a recent backup before proceeding.
              </Card.Text>
              <Form onSubmit={handleCleanupSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>From Date</Form.Label>
                      <Form.Control type="date" name="fromDate" value={cleanupForm.fromDate} onChange={handleCleanupChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>To Date</Form.Label>
                      <Form.Control type="date" name="toDate" value={cleanupForm.toDate} onChange={handleCleanupChange} required />
                    </Form.Group>
                  </Col>
                </Row>
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

export default BackupPage;
