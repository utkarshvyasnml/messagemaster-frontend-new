import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Spinner,
  Alert,
  Image,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const WhitelabelPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // State to hold the whitelabel settings
  const [form, setForm] = useState({
    companyName: '',
    companyLogo: null, // This will hold the new file to upload
  });
  const [currentLogoUrl, setCurrentLogoUrl] = useState(''); // To display the existing logo

  // Fetch the current reseller's whitelabel settings when the page loads
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      // We will create this API endpoint in the next step
      const { data } = await axios.get('https://messagemaster-backend.onrender.com/api/whitelabel/settings', config);
      setForm({ companyName: data.companyName || '' });
      setCurrentLogoUrl(data.companyLogo || '');
    } catch (err) {
      setError('Failed to load current settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setForm({ ...form, companyLogo: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('companyName', form.companyName);
      if (form.companyLogo) {
        formData.append('companyLogo', form.companyLogo);
      }

      const config = { headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } };
      // We will create this API endpoint in the next step
      await axios.post('https://messagemaster-backend.onrender.com/api/whitelabel/settings', formData, config);
      
      setSuccess('Settings updated successfully!');
      fetchSettings(); // Refresh settings after update
    } catch (err) {
      setError('Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4">🎨 Whitelabel Settings</h2>
      <p>Customize the application with your own branding. Your logo and company name will be shown to your users.</p>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card className="p-3 shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter your company name"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Company Logo</Form.Label>
                  <Form.Control
                    type="file"
                    name="companyLogo"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                  />
                  <Form.Text>Recommended size: 200x50 pixels. Use a transparent PNG for best results.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={4} className="text-center">
                <Form.Label>Current Logo Preview</Form.Label>
                <div className="p-3 border rounded bg-light" style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentLogoUrl ? (
                    <Image src={`https://messagemaster-backend.onrender.com${currentLogoUrl}`} alt="Current Logo" fluid style={{ maxHeight: '100px' }} />
                  ) : (
                    <p className="text-muted">No logo uploaded</p>
                  )}
                </div>
              </Col>
            </Row>
            
            <hr />

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? <Spinner size="sm" /> : "Save Settings"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default WhitelabelPage;
