import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  InputGroup,
  Tooltip,
  OverlayTrigger,
} from "react-bootstrap";
import indianStatesCities from "../data/indianStatesCities.json";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("Authentication token not found in localStorage!");
    }
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const UsersPage = () => {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // State for modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreditDetailsModal, setShowCreditDetailsModal] = useState(false);
  const [showCreditHistoryModal, setShowCreditHistoryModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "", email: "", password: "", role: "User", firmName: "",
    mobile: "", address: "", state: "", city: "", pincode: "",
    contactPerson: "", contactPersonPhone: ""
  });
  const [companyLogoFile, setCompanyLogoFile] = useState(null); // ✅ NEW: State for the logo file

  const [creditHistory, setCreditHistory] = useState([]);
  const [cities, setCities] = useState([]);

  const fetchUsersAndCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const config = getAuthHeaders();
      
      const usersRes = await axios.get("https://messagemaster-backend.onrender.com/api/users", config);
      const creditsRes = await axios.get("https://messagemaster-backend.onrender.com/api/credits", config);
      const allTransactions = creditsRes.data;

      const usersWithCredits = usersRes.data.map((user) => {
        const userTransactions = allTransactions.filter((t) => t.to === user.email);
        const groupedCredits = userTransactions.reduce((acc, tx) => {
          if (!acc[tx.creditType]) acc[tx.creditType] = { added: 0, removed: 0 };
          if (tx.type === "Added") acc[tx.creditType].added += tx.count;
          else acc[tx.creditType].removed += tx.count;
          return acc;
        }, {});
        const totalRemaining = Object.values(groupedCredits).reduce((sum, val) => sum + (val.added - val.removed), 0);
        return { ...user, credits: totalRemaining, creditDetails: groupedCredits };
      });
      setUsers(usersWithCredits);
    } catch (err) {
      setError("Failed to load user data. Please ensure you are logged in.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndCredits();
  }, [fetchUsersAndCredits]);


  const filteredUsers = users.filter(user => 
    (filterStatus === "All" || user.status === filterStatus) &&
    (user.name?.toLowerCase().includes(search.toLowerCase()) || user.email?.toLowerCase().includes(search.toLowerCase()))
  );

  // --- Modal Handlers ---
  const handleShowEditModal = (user) => {
    setSelectedUser({ ...user });
    const selectedState = indianStatesCities.find(s => s.state === user.state);
    setCities(selectedState ? selectedState.cities : []);
    setCompanyLogoFile(null); // Reset file on modal open
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => setShowEditModal(false);

  const handleShowAddModal = () => {
    setNewUser({ name: "", email: "", password: "", role: "User", firmName: "", mobile: "", address: "", state: "", city: "", pincode: "", contactPerson: "", contactPersonPhone: "" });
    setCities([]);
    setShowAddModal(true);
  };
  const handleCloseAddModal = () => setShowAddModal(false);
  
  const handleShowCreditDetails = (user) => {
      setSelectedUser(user);
      setShowCreditDetailsModal(true);
  };
  const handleCloseCreditDetails = () => setShowCreditDetailsModal(false);
  
  const handleShowCreditHistory = async (user) => {
    setSelectedUser(user);
    const config = getAuthHeaders();
    try {
        const creditsRes = await axios.get("https://messagemaster-backend.onrender.com/api/credits", config);
        setCreditHistory(creditsRes.data.filter(c => c.to === user.email));
        setShowCreditHistoryModal(true);
    } catch (err) {
        setError("Could not fetch credit history.");
    }
  };
  const handleCloseCreditHistory = () => setShowCreditHistoryModal(false);

  // --- Form and API Handlers ---
  const handleInputChange = (e, formSetter, formState) => {
    const { name, value } = e.target;
    formSetter({ ...formState, [name]: value });
  };
  
  // ✅ NEW: Specific handler for the logo file
  const handleLogoFileChange = (e) => {
    setCompanyLogoFile(e.target.files[0]);
  };
  
  const handleStateChange = (e, formSetter, formState) => {
    const selectedStateName = e.target.value;
    formSetter({ ...formState, state: selectedStateName, city: "" });
    const stateData = indianStatesCities.find(s => s.state === selectedStateName);
    setCities(stateData ? stateData.cities : []);
  };

  // ✅ CHANGED: Now uses FormData to support file uploads for whitelabeling
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
        setLoading(true);
        const formData = new FormData();
        // Append all fields from the selectedUser state
        for (const key in selectedUser) {
            if (key !== 'password' || (key === 'password' && selectedUser.password)) { // Don't send empty password
                 formData.append(key, selectedUser[key]);
            }
        }
        // Append the logo file if it exists
        if (companyLogoFile) {
            formData.append('companyLogo', companyLogoFile);
        }

        const config = { headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' } };
        await axios.put(`https://messagemaster-backend.onrender.com/api/users/update/${selectedUser._id}`, formData, config);
        
        setSuccess("User updated successfully!");
        fetchUsersAndCredits();
        setTimeout(() => { setSuccess(""); handleCloseEditModal(); }, 1500);
    } catch (err) {
        setError(err.response?.data?.message || "Error updating user.");
    } finally {
        setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post("https://messagemaster-backend.onrender.com/api/users", newUser, getAuthHeaders());
      setSuccess("User created successfully!");
      fetchUsersAndCredits();
      setTimeout(() => { setSuccess(""); handleCloseAddModal(); }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Error creating user.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleStatus = async (user) => {
    try {
        const newStatus = user.status === "Active" ? "Blocked" : "Active";
        await axios.put(`https://messagemaster-backend.onrender.com/api/users/${user._id}`, { status: newStatus }, getAuthHeaders());
        fetchUsersAndCredits();
    } catch(err) {
        alert("Error updating status");
    }
  };
  
  const getCreatableRoles = () => {
      if (currentUser?.role === 'Admin') return ['User', 'Sub-Reseller', 'Reseller'];
      if (currentUser?.role === 'Reseller') return ['User', 'Sub-Reseller'];
      return ['User'];
  };

  return (
    <div className="container-fluid mt-4">
      <h2 className="mb-4">👥 Users Management</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="mb-3">
        <Col md={6}>
          <InputGroup>
            <Form.Control placeholder="Search by name, email, firm..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Blocked">Blocked</option>
          </Form.Select>
        </Col>
        <Col md={3} className="text-end">
          <Button variant="primary" onClick={handleShowAddModal}>➕ Add User</Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive className="shadow-sm">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Firm / Company</th>
              <th>State / City</th>
              <th>Created By</th>
              <th>Status</th>
              <th>Credits</th>
              <th>Own Number</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? filteredUsers.map((user, i) => (
              <tr key={user._id}>
                <td>{i + 1}</td>
                <td><Link to={`/profile/${user._id}`}>{user.name}</Link></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.firmName || "-"}</td>
                <td>{user.state || "-"} / {user.city || "-"}</td>
                <td>{user.createdBy || "Admin"}</td>
                <td><Badge bg={user.status === "Active" ? "success" : "danger"}>{user.status}</Badge></td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tooltip-${user._id}`}>
                        <strong>Credit Breakdown:</strong>
                        {Object.entries(user.creditDetails || {}).length > 0 ? 
                            Object.entries(user.creditDetails).map(([type, val]) => (
                                <div key={type}>{`${type}: ${val.added - val.removed}`}</div>
                            )) : <div>No credits</div>}
                      </Tooltip>
                    }
                  >
                    <Badge bg="info" text="dark" style={{ cursor: 'pointer' }} onClick={() => handleShowCreditDetails(user)}>
                        {user.credits || 0}
                    </Badge>
                  </OverlayTrigger>
                </td>
                <td>{user.ownNumber || "-"}</td>
                <td>{new Date(user.createdAt).toLocaleString()}</td>
                <td>
                  <Button size="sm" variant="info" className="me-2 mb-1" onClick={() => handleShowEditModal(user)}>✏️ Edit</Button>
                  <Button size="sm" variant="secondary" className="me-2 mb-1" onClick={() => handleShowCreditHistory(user)}>💳 History</Button>
                  <Button size="sm" variant={user.status === "Active" ? "danger" : "success"} className="mb-1" onClick={() => handleToggleStatus(user)}>
                    {user.status === "Active" ? "Block" : "Unblock"}
                  </Button>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan="12" className="text-center py-4">No users found.</td>
                </tr>
            )}
          </tbody>
        </Table>
      )}

      {/* Add User Modal */}
      <Modal show={showAddModal} onHide={handleCloseAddModal} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Add New User</Modal.Title></Modal.Header>
        <Modal.Body>
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleAddUser}>
             <Row className="mb-3">
                <Col md={6}><Form.Group><Form.Label>Name</Form.Label><Form.Control type="text" name="name" value={newUser.name} onChange={(e) => handleInputChange(e, setNewUser, newUser)} required /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>Email</Form.Label><Form.Control type="email" name="email" value={newUser.email} onChange={(e) => handleInputChange(e, setNewUser, newUser)} required /></Form.Group></Col>
            </Row>
            <Row className="mb-3">
                <Col md={6}><Form.Group><Form.Label>Password</Form.Label><Form.Control type="password" name="password" placeholder="Default: 123456" onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group></Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Role</Form.Label>
                    <Form.Select name="role" value={newUser.role} onChange={(e) => handleInputChange(e, setNewUser, newUser)}>
                      {getCreatableRoles().map(role => (<option key={role} value={role}>{role}</option>))}
                    </Form.Select>
                  </Form.Group>
                </Col>
            </Row>
            <Row className="mb-3">
                <Col md={6}><Form.Group><Form.Label>Firm / Company</Form.Label><Form.Control type="text" name="firmName" value={newUser.firmName} onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>Mobile Number</Form.Label><Form.Control type="text" name="mobile" value={newUser.mobile} onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group></Col>
            </Row>
             <Row className="mb-3">
                <Col md={6}><Form.Group><Form.Label>Contact Person</Form.Label><Form.Control type="text" name="contactPerson" value={newUser.contactPerson} onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>Contact Person Phone</Form.Label><Form.Control type="text" name="contactPersonPhone" value={newUser.contactPersonPhone} onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Address</Form.Label><Form.Control type="text" name="address" value={newUser.address} onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group>
            <Row className="mb-3">
                <Col md={4}><Form.Group><Form.Label>State</Form.Label><Form.Select name="state" value={newUser.state} onChange={(e) => handleStateChange(e, setNewUser, newUser)}><option value="">Select State</option>{indianStatesCities.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}</Form.Select></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>City</Form.Label><Form.Select name="city" value={newUser.city} onChange={(e) => handleInputChange(e, setNewUser, newUser)}><option value="">Select City</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</Form.Select></Form.Group></Col>
                <Col md={4}><Form.Group><Form.Label>Pincode</Form.Label><Form.Control type="text" name="pincode" value={newUser.pincode} onChange={(e) => handleInputChange(e, setNewUser, newUser)} /></Form.Group></Col>
            </Row>
            <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner size="sm" /> : "Create User"}</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Edit User Modal */}
      {selectedUser && (
        <Modal show={showEditModal} onHide={handleCloseEditModal} size="lg" centered>
          <Modal.Header closeButton><Modal.Title>Edit User: {selectedUser.name}</Modal.Title></Modal.Header>
          <Modal.Body>
             <Form onSubmit={handleUpdateUser}>
                <Row className="mb-3">
                    <Col md={6}><Form.Group><Form.Label>Name</Form.Label><Form.Control type="text" name="name" value={selectedUser.name} onChange={(e) => handleInputChange(e, setSelectedUser, selectedUser)} required /></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Email</Form.Label><Form.Control type="email" name="email" value={selectedUser.email} onChange={(e) => handleInputChange(e, setSelectedUser, selectedUser)} required /></Form.Group></Col>
                </Row>
                <Row className="mb-3">
                    <Col md={6}><Form.Group><Form.Label>New Password</Form.Label><Form.Control type="password" name="password" placeholder="Leave blank to keep unchanged" onChange={(e) => handleInputChange(e, setSelectedUser, selectedUser)} /></Form.Group></Col>
                    <Col md={6}><Form.Group><Form.Label>Status</Form.Label><Form.Select name="status" value={selectedUser.status} onChange={(e) => handleInputChange(e, setSelectedUser, selectedUser)}><option value="Active">Active</option><option value="Blocked">Blocked</option></Form.Select></Form.Group></Col>
                </Row>
                
                {/* ✅ NEW: Whitelabel fields for Admin */}
                {currentUser?.role === 'Admin' && (selectedUser.role === 'Reseller' || selectedUser.role === 'Sub-Reseller') && (
                    <>
                        <hr />
                        <h5>Whitelabel Settings (Admin Only)</h5>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Company Name</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        name="companyName"
                                        placeholder="Enter company name for this user"
                                        value={selectedUser.companyName || ''} 
                                        onChange={(e) => handleInputChange(e, setSelectedUser, selectedUser)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Company Logo</Form.Label>
                                    <Form.Control 
                                        type="file" 
                                        accept="image/png, image/jpeg"
                                        onChange={handleLogoFileChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </>
                )}

                <Button type="submit" variant="primary" disabled={loading}>{loading ? <Spinner size="sm" /> : "Save Changes"}</Button>
             </Form>
          </Modal.Body>
        </Modal>
      )}

      {/* Credit Details Modal */}
      {selectedUser && (
        <Modal show={showCreditDetailsModal} onHide={handleCloseCreditDetails} centered>
            <Modal.Header closeButton><Modal.Title>Credit Details for {selectedUser.name}</Modal.Title></Modal.Header>
            <Modal.Body>
                <Table striped bordered>
                    <thead><tr><th>Credit Type</th><th>Remaining</th></tr></thead>
                    <tbody>
                        {Object.entries(selectedUser.creditDetails || {}).map(([type, val]) => (
                            <tr key={type}><td>{type}</td><td>{val.added - val.removed}</td></tr>
                        ))}
                    </tbody>
                </Table>
            </Modal.Body>
        </Modal>
      )}
      
      {/* Credit History Modal */}
      <Modal show={showCreditHistoryModal} onHide={handleCloseCreditHistory} size="lg" centered>
        <Modal.Header closeButton><Modal.Title>Credit History for {selectedUser?.name}</Modal.Title></Modal.Header>
        <Modal.Body>
            <Table striped bordered hover responsive>
                <thead><tr><th>Date</th><th>Type</th><th>Credit Type</th><th>Count</th><th>By</th><th>Reason</th></tr></thead>
                <tbody>
                    {creditHistory.map(tx => (
                        <tr key={tx._id}>
                            <td>{new Date(tx.createdAt).toLocaleString()}</td>
                            <td><Badge bg={tx.type === 'Added' ? 'success' : 'danger'}>{tx.type}</Badge></td>
                            <td>{tx.creditType}</td>
                            <td>{tx.count}</td>
                            <td>{tx.by}</td>
                            <td>{tx.reason || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default UsersPage;
