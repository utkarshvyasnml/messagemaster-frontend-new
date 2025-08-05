import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Modal } from 'react-bootstrap';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // State for the Forgot Password Modal
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [modalStep, setModalStep] = useState(1); // 1 for email input, 2 for OTP input
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.post('https://messagemaster-backend.onrender.com/api/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        setModalError('');
        setModalSuccess('');
        try {
            const { data } = await axios.post('https://messagemaster-backend.onrender.com/api/forgot-password', { email: forgotEmail });
            setModalSuccess(data.message);
            setModalStep(2); // Move to the next step
        } catch (err) {
            setModalError('Failed to send OTP. Please try again.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        setModalError('');
        setModalSuccess('');
        try {
            const { data } = await axios.post('https://messagemaster-backend.onrender.com/api/reset-password', { email: forgotEmail, otp, newPassword });
            setModalSuccess(data.message + " You can now log in with your new password.");
            setTimeout(() => {
                setShowForgotModal(false);
                setModalStep(1);
            }, 3000);
        } catch (err) {
            setModalError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowForgotModal(false);
        setModalStep(1);
        setModalError('');
        setModalSuccess('');
        setForgotEmail('');
        setOtp('');
        setNewPassword('');
    };

    return (
        <>
            <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                <Row className="w-100">
                    <Col md={6} lg={4} className="mx-auto">
                        <Card className="p-4 shadow-sm">
                            <Card.Body>
                                <h2 className="text-center mb-4">MessageMaster Login</h2>
                                {error && <Alert variant="danger">{error}</Alert>}
                                <Form onSubmit={handleLogin}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email Address</Form.Label>
                                        <Form.Control
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                    <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : "Log In"}
                                    </Button>
                                </Form>
                                <div className="text-center mt-3">
                                    <Button variant="link" onClick={() => setShowForgotModal(true)}>
                                        Forgot Password?
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Forgot Password Modal */}
            <Modal show={showForgotModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Reset Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {modalError && <Alert variant="danger">{modalError}</Alert>}
                    {modalSuccess && <Alert variant="success">{modalSuccess}</Alert>}

                    {modalStep === 1 ? (
                        <Form onSubmit={handleRequestOtp}>
                            <p>Please enter your email address to receive a password reset OTP.</p>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Button type="submit" variant="primary" disabled={modalLoading}>
                                {modalLoading ? <Spinner size="sm" /> : "Send OTP"}
                            </Button>
                        </Form>
                    ) : (
                        <Form onSubmit={handleResetPassword}>
                            <p>An OTP has been sent to <strong>{forgotEmail}</strong>. Please check your email.</p>
                            <Form.Group className="mb-3">
                                <Form.Label>OTP</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>New Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </Form.Group>
                            <Button type="submit" variant="primary" disabled={modalLoading}>
                                {modalLoading ? <Spinner size="sm" /> : "Reset Password"}
                            </Button>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
};

export default LoginPage;
