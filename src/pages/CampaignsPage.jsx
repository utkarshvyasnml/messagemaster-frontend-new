import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Form, Button, Table, Badge, Row, Col, Alert, Spinner, Card, Modal, InputGroup
} from "react-bootstrap";
import { CSVLink } from "react-csv";
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';


// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) console.error("Authentication token not found!");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const CampaignsPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [usersForDropdown, setUsersForDropdown] = useState([]);
  const [allCreditTransactions, setAllCreditTransactions] = useState([]);
  
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({
    userEmail: "", creditType: "Normal Message - domestic", message: "",
    dp: null, singleCreative: null, images: [], pdf: null, video: null, audio: null,
    ctaCall: "", ctaCallText: "", ctaURL: "", ctaURLText: "",
    countryName: "", countryCode: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUserOwnNumber, setSelectedUserOwnNumber] = useState("");
  const [selectedUserCredits, setSelectedUserCredits] = useState(0);

  // Modal States
  const [viewCampaign, setViewCampaign] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadReportModal, setShowUploadReportModal] = useState(false);
  const [showViewReportModal, setShowViewReportModal] = useState(false);
  const [showRejectCancellationModal, setShowRejectCancellationModal] = useState(false);

  // Data for Modals
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [refundOption, setRefundOption] = useState("user");
  const [newStatus, setNewStatus] = useState("");
  const [reportFile, setReportFile] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Filter States
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCreditType, setFilterCreditType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const navigate = useNavigate();

  const creditTypeOptions = [
    "Normal Message - domestic", "Normal Message - international", "With DP - domestic",
    "With DP - international", "With CTA - domestic", "With CTA - international",
    "With DP & CTA - domestic", "Own Number + DP + CTA",
  ];

  const statusColors = {
    Submitted: "secondary", "Pending Approval": "warning", Approved: "info",
    Processing: "primary", Completed: "success", Rejected: "danger", "Report Generated": "dark",
    "Cancellation Requested": "warning", "Cancelled": "danger"
  };

  const fetchCampaignsAndUsers = useCallback(async (loggedInUser) => {
    try {
      setLoading(true);
      setError("");
      const config = getAuthHeaders();
      
      const [campaignsRes, usersRes, creditsRes] = await Promise.all([
        axios.get("https://messagemaster-backend.onrender.com/api/campaigns", config),
        axios.get("https://messagemaster-backend.onrender.com/api/users", config),
        axios.get("https://messagemaster-backend.onrender.com/api/credits", config)
      ]);

      setCampaigns(campaignsRes.data);
      setAllCreditTransactions(creditsRes.data);
      
      const managedUsers = usersRes.data.filter((u) => u.status === "Active");
      const selfUser = { _id: loggedInUser.id, name: `${loggedInUser.name} (Self)`, email: loggedInUser.email, ownNumber: loggedInUser.ownNumber };
      setUsersForDropdown([selfUser, ...managedUsers]);

    } catch (err) {
        if (err.response && err.response.status === 401) {
            setError("Your session has expired. Please log in again.");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setTimeout(() => navigate("/login"), 2000);
        } else {
            setError("❌ Failed to load page data.");
        }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const userFromStorage = JSON.parse(localStorage.getItem("user"));
    if (userFromStorage) {
        setCurrentUser(userFromStorage);
    } else {
        setError("You must be logged in to view this page.");
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchCampaignsAndUsers(currentUser);
    }
  }, [currentUser, fetchCampaignsAndUsers]);

    // ✅ NEW: Recalculate credits whenever the selected user or credit type changes.
    useEffect(() => {
        if (form.userEmail && allCreditTransactions.length > 0) {
            const userTransactions = allCreditTransactions.filter(
                tx => tx.to === form.userEmail && tx.creditType === form.creditType
            );
            const balance = userTransactions.reduce((acc, tx) => {
                return tx.type === 'Added' ? acc + tx.count : acc - tx.count;
            }, 0);
            setSelectedUserCredits(balance);
        } else {
            setSelectedUserCredits(0);
        }
    }, [form.userEmail, form.creditType, allCreditTransactions]);


    const handleRecipientsChange = (e) => {
        const text = e.target.value;
        const numbers = text.split(/[\s,;\n]+/).filter(num => num.trim() !== '');
        setRecipients(numbers);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                const numbersFromFile = json.flat().map(String).filter(val => /^\d+$/.test(val.trim()));
                setRecipients(prev => [...new Set([...prev, ...numbersFromFile])]);
            } catch (fileError) {
                setError("Could not read the file. Please ensure it's a valid CSV or Excel file.");
            }
        };
        reader.onerror = () => setError("Failed to read the file.");
        reader.readAsBinaryString(file);
    };

    const handleFileChange = (e, field) => {
        if (field === "images") {
            setForm({ ...form, images: Array.from(e.target.files) });
        } else {
            setForm({ ...form, [field]: e.target.files[0] });
        }
    };

    const resetForm = () => {
        setForm({
            userEmail: "", creditType: "Normal Message - domestic", message: "",
            dp: null, singleCreative: null, images: [], pdf: null, video: null, audio: null,
            ctaCall: "", ctaCallText: "", ctaURL: "", ctaURLText: "",
            countryName: "", countryCode: ""
        });
        setRecipients([]);
        setSelectedUserOwnNumber("");
        setSelectedUserCredits(0);
    };

    const handleUserChange = (email) => {
        setForm({ ...form, userEmail: email });
        const user = usersForDropdown.find((u) => u.email === email);
        setSelectedUserOwnNumber(user?.ownNumber || "");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); 
        
        if (recipients.length === 0) {
            setError("Please add at least one recipient.");
            return;
        }
        if (recipients.length > selectedUserCredits) {
            setError(`Insufficient credits for this message type. You need ${recipients.length}, but the user only has ${selectedUserCredits}.`);
            return;
        }

        setSuccess(""); 
        setLoading(true);

        let finalRecipients = [...recipients];
        if (form.creditType.includes("international") && form.countryCode) {
            finalRecipients = recipients.map(num => `${form.countryCode}${num.trim()}`);
        }

        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key === 'images' && Array.isArray(form[key])) {
                    form[key].forEach(file => formData.append('images', file));
                } else if (form[key]) {
                    formData.append(key, form[key]);
                }
            });
            formData.append('to', finalRecipients.join(','));

            const config = { headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" } };
            await axios.post("https://messagemaster-backend.onrender.com/api/campaigns", formData, config);
            setSuccess("✅ Campaign created successfully!");
            fetchCampaignsAndUsers(currentUser);
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || "❌ Error creating campaign.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (campaign) => {
        setSelectedCampaign(campaign);
        setRefundOption("user");
        setShowRefundModal(true);
    };

    const confirmDeleteCampaign = async () => {
        try {
            setLoading(true);
            const config = { ...getAuthHeaders(), params: { refundOption } };
            await axios.delete(`https://messagemaster-backend.onrender.com/api/campaigns/${selectedCampaign._id}`, config);
            setSuccess("✅ Campaign deleted successfully!");
            setShowRefundModal(false);
            fetchCampaignsAndUsers(currentUser);
        } catch (err) {
            setError("❌ Error deleting campaign.");
        } finally {
            setLoading(false);
        }
    };

    const handleChangeStatusClick = (campaign) => {
        setSelectedCampaign(campaign);
        setNewStatus(campaign.status);
        setShowStatusModal(true);
    };

    const handleUpdateStatus = async () => {
        try {
            setLoading(true);
            await axios.put(`https://messagemaster-backend.onrender.com/api/campaigns/status/${selectedCampaign._id}`, { status: newStatus }, getAuthHeaders());
            setSuccess(`✅ Status updated to ${newStatus}`);
            fetchCampaignsAndUsers(currentUser);
            setShowStatusModal(false);
        } catch (err) {
            setError("❌ Error updating campaign status.");
        } finally {
            setLoading(false);
        }
    };

  const handleShowUploadReportModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowUploadReportModal(true);
  };

  const handleUploadReport = async (e) => {
    e.preventDefault();
    if (!reportFile) {
      setError("Please select a report file to upload.");
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("reportFile", reportFile);
      const config = { headers: { ...getAuthHeaders().headers, "Content-Type": "multipart/form-data" } };
      await axios.post(`https://messagemaster-backend.onrender.com/api/campaigns/${selectedCampaign._id}/upload-report`, formData, config);
      setSuccess("Report uploaded successfully!");
      fetchCampaignsAndUsers(currentUser);
      setShowUploadReportModal(false);
      setReportFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Error uploading report.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowViewReportModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowViewReportModal(true);
  };

  const downloadFile = async (url, filename) => {
    try {
      const response = await axios.get(`https://messagemaster-backend.onrender.com${url}`, {
        responseType: 'blob',
        ...getAuthHeaders(),
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(new Blob([response.data]));
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Could not download the attachment.');
    }
  };

  const handleDownloadAttachments = (campaign) => {
      const getFileExtension = (path) => path.split('.').pop();
      if (campaign.dp) downloadFile(campaign.dp, `dp-${campaign._id}.${getFileExtension(campaign.dp)}`);
      if (campaign.singleCreative) downloadFile(campaign.singleCreative, `creative-${campaign._id}.${getFileExtension(campaign.singleCreative)}`);
      if (campaign.pdf) downloadFile(campaign.pdf, `pdf-${campaign._id}.pdf`);
      if (campaign.video) downloadFile(campaign.video, `video-${campaign._id}.mp4`);
      if (campaign.audio) downloadFile(campaign.audio, `audio-${campaign._id}.mp3`);
      (campaign.images || []).forEach((img, index) => {
          downloadFile(img, `image-${index + 1}-${campaign._id}.${getFileExtension(img)}`);
      });
  };
  
  const handleDownloadRecipients = (campaign) => {
      const recipients = campaign.to.replace(/,/g, '\n');
      const blob = new Blob([recipients], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `recipients-${campaign._id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleRequestCancellation = async (campaign) => {
      if (window.confirm("Are you sure you want to request cancellation for this campaign?")) {
          try {
              setLoading(true);
              await axios.put(`https://messagemaster-backend.onrender.com/api/campaigns/${campaign._id}/request-cancellation`, {}, getAuthHeaders());
              setSuccess("Cancellation request submitted successfully.");
              fetchCampaignsAndUsers(currentUser);
          } catch (err) {
              setError("Failed to submit cancellation request.");
          } finally {
              setLoading(false);
          }
      }
  };

  const handleApproveCancellation = async (campaign) => {
      if (window.confirm("Are you sure you want to approve this cancellation? The campaign will be cancelled and credits refunded.")) {
          try {
              setLoading(true);
              await axios.put(`https://messagemaster-backend.onrender.com/api/campaigns/${campaign._id}/handle-cancellation`, { action: 'approve' }, getAuthHeaders());
              setSuccess("Campaign cancellation approved.");
              fetchCampaignsAndUsers(currentUser);
          } catch (err) {
              setError("Failed to approve cancellation.");
          } finally {
              setLoading(false);
          }
      }
  };

  const handleShowRejectModal = (campaign) => {
      setSelectedCampaign(campaign);
      setShowRejectCancellationModal(true);
  };

  const handleRejectCancellation = async (e) => {
      e.preventDefault();
      try {
          setLoading(true);
          await axios.put(`https://messagemaster-backend.onrender.com/api/campaigns/${selectedCampaign._id}/handle-cancellation`, { action: 'reject', reason: rejectionReason }, getAuthHeaders());
          setSuccess("Campaign cancellation rejected.");
          fetchCampaignsAndUsers(currentUser);
          setShowRejectCancellationModal(false);
          setRejectionReason("");
      } catch (err) {
          setError("Failed to reject cancellation.");
      } finally {
          setLoading(false);
      }
  };


  const filteredCampaigns = campaigns.filter(c => {
      const campaignDate = new Date(c.createdAt);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      return (
          (!from || campaignDate >= from) &&
          (!to || campaignDate <= to) &&
          (filterUser === "" || c.userEmail === filterUser) &&
          (filterStatus === "" || c.status === filterStatus) &&
          (filterCreditType === "" || c.creditType === filterCreditType)
      );
  });

  const showDPField = form.creditType.includes("DP");
  const showCTAFields = form.creditType.includes("CTA");
  const isOwnNumberType = form.creditType === "Own Number + DP + CTA";
  const isInternational = form.creditType.includes("international");
  const hasInsufficientCredits = recipients.length > selectedUserCredits;

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📤 Campaign Management</h2>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

      <Card className="p-3 shadow-sm mb-4">
        <Form onSubmit={handleSubmit}>
          <h4>Create New Campaign</h4>
          <hr />
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Select User (On behalf of)</Form.Label>
                <Form.Select value={form.userEmail} onChange={(e) => handleUserChange(e.target.value)} required>
                  <option value="">-- Select User --</option>
                  {usersForDropdown.map((user) => (
                    <option key={user._id} value={user.email}>{user.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Credit Type</Form.Label>
                <Form.Select value={form.creditType} onChange={(e) => setForm({ ...form, creditType: e.target.value })}>
                  {creditTypeOptions.map((type) => (<option key={type} value={type}>{type}</option>))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
                <Form.Group>
                    <Form.Label>Available Credits (for this type)</Form.Label>
                    <Form.Control type="text" value={selectedUserCredits} disabled />
                </Form.Group>
            </Col>
          </Row>

          {isInternational && (
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Country Name</Form.Label>
                  <Form.Control type="text" placeholder="e.g., United States" value={form.countryName} onChange={(e) => setForm({ ...form, countryName: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Country Code</Form.Label>
                  <Form.Control type="text" placeholder="e.g., 1 (without +)" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
          )}

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="d-flex justify-content-between">
                  Recipients
                  <Badge pill bg={hasInsufficientCredits ? "danger" : "primary"}>
                    {recipients.length} / {selectedUserCredits} Credits
                  </Badge>
                </Form.Label>
                <InputGroup>
                  <Form.Control as="textarea" rows={3} 
                    placeholder="Paste numbers here (comma, space, or newline separated)" 
                    value={recipients.join('\n')}
                    onChange={handleRecipientsChange} 
                  />
                  <Button as="label" htmlFor="recipient-file-upload" variant="outline-secondary" className="d-flex align-items-center">
                    Upload File
                  </Button>
                  <input id="recipient-file-upload" type="file" hidden accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                </InputGroup>
                <Form.Text>You can either paste numbers or upload a CSV/Excel file.</Form.Text>
              </Form.Group>
            </Col>
          </Row>
          
          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Message</Form.Label>
                <Form.Control as="textarea" rows={3} placeholder="Write your message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
              </Form.Group>
            </Col>
          </Row>
          {showDPField && (
            <Row className="mb-3"><Col md={4}><Form.Group><Form.Label>Upload DP</Form.Label><Form.Control type="file" accept="image/*" onChange={(e) => setForm({ ...form, dp: e.target.files[0] })} /></Form.Group></Col></Row>
          )}
          {showCTAFields ? (
            <>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Upload Creative</Form.Label>
                    <Form.Control type="file" accept="image/*,application/pdf,video/*" onChange={(e) => setForm({ ...form, singleCreative: e.target.files[0] })} required />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={3}><Form.Group><Form.Label>CTA Call Number</Form.Label><Form.Control type="text" value={form.ctaCall} onChange={(e) => setForm({ ...form, ctaCall: e.target.value })} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>CTA Call Text</Form.Label><Form.Control type="text" value={form.ctaCallText} onChange={(e) => setForm({ ...form, ctaCallText: e.target.value })} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>CTA URL</Form.Label><Form.Control type="url" value={form.ctaURL} onChange={(e) => setForm({ ...form, ctaURL: e.target.value })} /></Form.Group></Col>
                <Col md={3}><Form.Group><Form.Label>CTA URL Text</Form.Label><Form.Control type="text" value={form.ctaURLText} onChange={(e) => setForm({ ...form, ctaURLText: e.target.value })} /></Form.Group></Col>
              </Row>
            </>
          ) : (
            <Row className="mb-3">
              <Col md={3}><Form.Group><Form.Label>Upload Images</Form.Label><Form.Control type="file" multiple accept="image/*" onChange={(e) => handleFileChange(e, "images")} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Upload PDF</Form.Label><Form.Control type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, "pdf")} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Upload Video</Form.Label><Form.Control type="file" accept="video/*" onChange={(e) => handleFileChange(e, "video")} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Upload Audio</Form.Label><Form.Control type="file" accept="audio/*" onChange={(e) => handleFileChange(e, "audio")} /></Form.Group></Col>
            </Row>
          )}

          <Button type="submit" variant="primary" disabled={loading || hasInsufficientCredits}>{loading ? <Spinner size="sm" /> : "Create Campaign"}</Button>
        </Form>
      </Card>

      <Card className="p-3 shadow-sm mb-4">
          <Row>
              <Col md={3}><Form.Group><Form.Label>From Date</Form.Label><Form.Control type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>To Date</Form.Label><Form.Control type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Filter by User</Form.Label><Form.Select value={filterUser} onChange={e => setFilterUser(e.target.value)}><option value="">All Users</option>{usersForDropdown.map(u => <option key={u._id} value={u.email}>{u.name}</option>)}</Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Filter by Status</Form.Label><Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">All Statuses</option>{Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}</Form.Select></Form.Group></Col>
          </Row>
      </Card>

      <Table striped bordered hover responsive>
        <thead className="table-light">
          <tr>
            <th>Campaign For</th>
            <th>Created By</th>
            <th>Type</th>
            <th>Recipients</th>
            <th>Delivered</th>
            <th>Failed</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCampaigns.map((c) => {
            const deliveredCount = c.report?.filter(r => r.status === 'Delivered').length || 0;
            const failedCount = c.report?.filter(r => r.status === 'Failed').length || 0;
            return (
              <tr key={c._id} className={c.status === 'Cancellation Requested' ? 'table-warning' : ''}>
                <td>{c.userEmail}</td>
                <td>
                  {c.createdBy === c.userEmail ? c.userEmail : `${c.createdBy} (on behalf)`}
                </td>
                <td>{c.creditType}</td>
                <td>{c.to.split(",").length}</td>
                <td><Badge bg="success">{deliveredCount}</Badge></td>
                <td><Badge bg="danger">{failedCount}</Badge></td>
                <td><Badge bg={statusColors[c.status] || "secondary"}>{c.status}</Badge></td>
                <td>
                  <Button size="sm" variant="info" className="me-2 mb-1" onClick={() => setViewCampaign(c)}>🔍 View</Button>
                  {c.report && c.report.length > 0 && (
                    <Button size="sm" variant="success" className="me-2 mb-1" onClick={() => handleShowViewReportModal(c)}>📊 View Report</Button>
                  )}
                  {currentUser?.role === "Admin" && c.status === "Completed" && (
                    <Button size="sm" variant="primary" className="me-2 mb-1" onClick={() => handleShowUploadReportModal(c)}>📤 Upload Report</Button>
                  )}
                  {currentUser?.role === "Admin" && c.status === "Report Generated" && (
                    <Button size="sm" variant="warning" className="me-2 mb-1" onClick={() => handleShowUploadReportModal(c)}>🔄 Update Report</Button>
                  )}
                   {currentUser?.role === "Admin" && (
                    <Button size="sm" variant="secondary" className="me-2 mb-1" onClick={() => handleChangeStatusClick(c)}>Change Status</Button>
                  )}
                  {currentUser?.role === "Admin" && c.status !== "Cancellation Requested" && (
                     <Button size="sm" variant="danger" className="me-2 mb-1" onClick={() => handleDeleteClick(c)}>❌ Delete</Button>
                  )}
                  {currentUser?.role === "Admin" && c.status === "Cancellation Requested" && (
                    <>
                      <Button size="sm" variant="success" className="me-2 mb-1" onClick={() => handleApproveCancellation(c)}>Approve Cancel</Button>
                      <Button size="sm" variant="danger" className="me-2 mb-1" onClick={() => handleShowRejectModal(c)}>Reject Cancel</Button>
                    </>
                  )}
                  {currentUser?.role !== "Admin" && !["Processing", "Completed", "Report Generated", "Rejected", "Cancelled", "Cancellation Requested"].includes(c.status) && (
                      <Button size="sm" variant="warning" className="me-2 mb-1" onClick={() => handleRequestCancellation(c)}>Request Cancellation</Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal show={!!viewCampaign} onHide={() => setViewCampaign(null)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Campaign Details</Modal.Title></Modal.Header>
        <Modal.Body>
          {viewCampaign && (
            <>
              {viewCampaign.status === 'Cancellation Requested' && (
                  <Alert variant="warning">
                      You have requested to cancel this campaign. Please wait for an admin to review your request.
                  </Alert>
              )}
              {viewCampaign.cancellationRejectionReason && (
                  <Alert variant="danger">
                      <strong>Cancellation Rejected:</strong> {viewCampaign.cancellationRejectionReason}
                  </Alert>
              )}

              <p><b>User:</b> {viewCampaign.userEmail}</p>
              <p><b>Created At:</b> {new Date(viewCampaign.createdAt).toLocaleString()}</p>
              <p><b>Message:</b> {viewCampaign.message}</p>
              {viewCampaign.ctaCall && <p><b>CTA Call:</b> {viewCampaign.ctaCall} (Text: {viewCampaign.ctaCallText})</p>}
              {viewCampaign.ctaURL && <p><b>CTA URL:</b> <a href={viewCampaign.ctaURL} target="_blank" rel="noopener noreferrer">{viewCampaign.ctaURL}</a> (Text: {viewCampaign.ctaURLText})</p>}
              <hr />
              <Button variant="primary" className="me-2" onClick={() => handleDownloadAttachments(viewCampaign)}>
                ⬇️ Download Attachments
              </Button>
              <Button variant="secondary" onClick={() => handleDownloadRecipients(viewCampaign)}>
                ⬇️ Download Recipients
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={showUploadReportModal} onHide={() => setShowUploadReportModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Upload Delivery Report</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUploadReport}>
            <Form.Group className="mb-3">
              <Form.Label>Report File (CSV)</Form.Label>
              <Form.Control type="file" accept=".csv" onChange={(e) => setReportFile(e.target.files[0])} required />
              <Form.Text>CSV must have 'recipient' and 'status' columns.</Form.Text>
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner size="sm" /> : "Upload"}</Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showViewReportModal} onHide={() => setShowViewReportModal(false)} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Delivery Report for Campaign</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedCampaign && (
            <>
              <CSVLink
                data={selectedCampaign.report || []}
                headers={[{ label: "Recipient", key: "recipient" }, { label: "Status", key: "status" }]}
                filename={`report-${selectedCampaign._id}.csv`}
                className="btn btn-success mb-3"
              >
                Export Report
              </CSVLink>
              <Table striped bordered hover responsive>
                <thead><tr><th>Recipient</th><th>Status</th></tr></thead>
                <tbody>
                  {selectedCampaign.report?.map((entry, index) => (
                    <tr key={index}>
                      <td>{entry.recipient}</td>
                      <td><Badge bg={entry.status === 'Delivered' ? 'success' : 'danger'}>{entry.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={showRefundModal} onHide={() => setShowRefundModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Delete Campaign & Refund</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Refund Credits To:</Form.Label>
            <Form.Select value={refundOption} onChange={(e) => setRefundOption(e.target.value)}>
              <option value="user">User</option>
              <option value="reseller">Reseller</option>
              <option value="none">No Refund</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefundModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteCampaign} disabled={loading}>{loading ? <Spinner size="sm" /> : "Confirm Delete"}</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Change Campaign Status</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Status</Form.Label>
            <Form.Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {Object.keys(statusColors).map(status => <option key={status} value={status}>{status}</option>)}
            </Form.Select>
          </Form.Group>
          <Button variant="primary" onClick={handleUpdateStatus} disabled={loading}>{loading ? <Spinner size="sm" /> : "Update Status"}</Button>
        </Modal.Body>
      </Modal>
      <Modal show={showRejectCancellationModal} onHide={() => setShowRejectCancellationModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Reject Cancellation Request</Modal.Title></Modal.Header>
        <Modal.Body>
            <Form onSubmit={handleRejectCancellation}>
                <Form.Group className="mb-3">
                    <Form.Label>Reason for Rejection</Form.Label>
                    <Form.Control as="textarea" rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} required />
                </Form.Group>
                <Button type="submit" variant="danger" disabled={loading}>{loading ? <Spinner size="sm" /> : "Confirm Rejection"}</Button>
            </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CampaignsPage;
