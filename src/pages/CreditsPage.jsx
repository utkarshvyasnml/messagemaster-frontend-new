import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Select from "react-select";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { utils, writeFile } from "xlsx";
import { Badge, Form, Button, Table, Card, Row, Col, Alert, Spinner } from "react-bootstrap";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const creditTypeOptions = [
  "Normal Message - domestic", "Normal Message - international", "With DP - domestic",
  "With DP - international", "With CTA - domestic", "With CTA - international",
  "With DP & CTA - domestic", "Own Number + DP + CTA",
];

const CreditsPage = () => {
  const [form, setForm] = useState({
    to: "",
    creditType: creditTypeOptions[0],
    count: 0,
    rate: 0,
    type: "Added",
    reason: "",
    ownNumber: "",
  });

  const [users, setUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filters, setFilters] = useState({
      user: "",
      creditType: "",
      fromDate: "",
      toDate: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const config = getAuthHeaders();
      const [usersRes, transactionsRes] = await Promise.all([
        axios.get("https://messagemaster-backend.onrender.com/api/users", config),
        axios.get("https://messagemaster-backend.onrender.com/api/credits", config),
      ]);
      setUsers(usersRes.data.filter((u) => u.status === "Active"));
      setAllTransactions(transactionsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data for the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.to) {
        setError("Please select a user before submitting.");
        return;
    }
    if (form.count <= 0) {
        setError("Message quantity must be greater than 0.");
        return;
    }
    // ✅ FIX: This validation is now conditional. Rate is only required when adding credits.
    if (form.type === 'Added' && form.rate <= 0) {
        setError("Rate must be greater than 0 when adding credits.");
        return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // If removing credits, ensure rate is 0 if not provided.
      const payload = {
          ...form,
          rate: form.type === 'Removed' ? form.rate || 0 : form.rate,
      };
      const res = await axios.post("https://messagemaster-backend.onrender.com/api/credits", payload, getAuthHeaders());
      setAllTransactions([res.data, ...allTransactions]);
      setSuccess("✅ Credit transaction saved!");
      setForm({
        to: "", creditType: creditTypeOptions[0], count: 0, rate: 0,
        type: "Added", reason: "", ownNumber: "",
      });
    } catch (err) {
      console.error("Error saving credit transaction:", err);
      setError(err.response?.data?.message || "❌ Error saving transaction.");
    } finally {
      setLoading(false);
    }
  };
  
  const filteredTransactions = allTransactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      const fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
      const toDate = filters.toDate ? new Date(filters.toDate) : null;

      return (
          (filters.user === "" || tx.to === filters.user) &&
          (filters.creditType === "" || tx.creditType === filters.creditType) &&
          (!fromDate || txDate >= fromDate) &&
          (!toDate || txDate <= toDate)
      );
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Credit Transactions", 14, 10);
    doc.autoTable({
      head: [["ID", "Type", "To", "Credit Type", "Count", "Rate (₹)", "Total (₹)", "Reason", "Time"]],
      body: filteredTransactions.map((tx) => [
        tx._id, tx.type, tx.to, tx.creditType, tx.count, tx.rate, tx.total, tx.reason || "-", new Date(tx.createdAt).toLocaleString(),
      ]),
      startY: 15,
      styles: { fontSize: 8 },
    });
    doc.save("credit_transactions.pdf");
  };

  const exportToExcel = () => {
    const sheet = utils.json_to_sheet(
      filteredTransactions.map((tx) => ({
        ID: tx._id, Type: tx.type, To: tx.to, "Credit Type": tx.creditType, Count: tx.count,
        "Rate (₹)": tx.rate, "Total (₹)": tx.total, Reason: tx.reason || "-", Time: new Date(tx.createdAt).toLocaleString(),
      }))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, sheet, "Credits");
    writeFile(wb, "credit_transactions.xlsx");
  };

  const totalSummary = filteredTransactions.reduce(
    (acc, tx) => {
      if (tx.type === "Added") {
        acc.credits += tx.count;
        acc.amount += tx.total;
      }
      return acc;
    },
    { credits: 0, amount: 0 }
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-4">💳 Credit Management</h2>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card as="form" onSubmit={handleSubmit} className="p-4 mb-4 shadow-sm">
        <h5 className="mb-3">Add / Remove Credits</h5>
        <Row className="g-3">
          <Col md={3}>
            <Form.Label><strong>Select User</strong></Form.Label>
            <Select
              options={users.map((user) => ({ value: user.email, label: `${user.name} (${user.email})` }))}
              value={form.to ? { value: form.to, label: users.find(u=>u.email === form.to)?.name ? `${users.find(u=>u.email === form.to).name} (${form.to})` : form.to } : null}
              onChange={(selected) => setForm({ ...form, to: selected?.value || "" })}
              placeholder="Search or select user"
              isClearable
            />
          </Col>
          <Col md={3}>
            <Form.Label><strong>Credit Type</strong></Form.Label>
            <Form.Select value={form.creditType} onChange={(e) => setForm({ ...form, creditType: e.target.value })}>
              {creditTypeOptions.map((type) => (<option key={type} value={type}>{type}</option>))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label><strong>Message Quantity</strong></Form.Label>
            <Form.Control type="number" value={form.count} onChange={(e) => setForm({ ...form, count: +e.target.value })} placeholder="0" />
          </Col>
          <Col md={3}>
            <Form.Label><strong>Rate Per Message (₹)</strong></Form.Label>
            <Form.Control type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: +e.target.value })} placeholder="0" />
          </Col>
        </Row>
        <Row className="g-3 mt-2">
          <Col md={4}>
            <Form.Label><strong>Transaction Type</strong></Form.Label>
            <Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="Added">Add Credit</option>
              <option value="Removed">Remove Credit</option>
            </Form.Select>
          </Col>
          {form.type === "Removed" && (
            <Col md={8}>
              <Form.Label><strong>Reason (Required for Removal)</strong></Form.Label>
              <Form.Control value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Enter reason" />
            </Col>
          )}
          {form.creditType === "Own Number + DP + CTA" && (
            <Col md={4} className="mt-3">
              <Form.Label><strong>Own Number (Sender ID)</strong></Form.Label>
              <Form.Control value={form.ownNumber} onChange={(e) => setForm({ ...form, ownNumber: e.target.value })} placeholder="Enter own sender number" required />
            </Col>
          )}
        </Row>
        <div className="text-end mt-3">
          <Button type="submit" variant="primary" disabled={loading || !form.to}>
            {loading ? <Spinner as="span" animation="border" size="sm" /> : "✅ Submit"}
          </Button>
        </div>
      </Card>

      <Card className="p-3 mb-4 shadow-sm">
          <Row className="g-3">
              <Col md={3}>
                  <Form.Group>
                      <Form.Label>Filter by User</Form.Label>
                      <Form.Select value={filters.user} onChange={(e) => setFilters({...filters, user: e.target.value})}>
                          <option value="">All Users</option>
                          {users.map(u => <option key={u._id} value={u.email}>{u.name}</option>)}
                      </Form.Select>
                  </Form.Group>
              </Col>
              <Col md={3}>
                  <Form.Group>
                      <Form.Label>Filter by Credit Type</Form.Label>
                      <Form.Select value={filters.creditType} onChange={(e) => setFilters({...filters, creditType: e.target.value})}>
                          <option value="">All Types</option>
                          {creditTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                      </Form.Select>
                  </Form.Group>
              </Col>
              <Col md={3}>
                  <Form.Group>
                      <Form.Label>From Date</Form.Label>
                      <Form.Control type="date" value={filters.fromDate} onChange={(e) => setFilters({...filters, fromDate: e.target.value})} />
                  </Form.Group>
              </Col>
              <Col md={3}>
                  <Form.Group>
                      <Form.Label>To Date</Form.Label>
                      <Form.Control type="date" value={filters.toDate} onChange={(e) => setFilters({...filters, toDate: e.target.value})} />
                  </Form.Group>
              </Col>
          </Row>
      </Card>

      <div className="d-flex justify-content-between mb-2">
        <h5>Transactions</h5>
        <div>
          <Button variant="outline-secondary" className="me-2" onClick={exportToPDF}>⬇️ Export PDF</Button>
          <Button variant="outline-success" onClick={exportToExcel}>📊 Export Excel</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-light">
            <tr>
              <th>ID</th><th>Type</th><th>To</th><th>Credit Type</th><th>Count</th><th>Rate (₹)</th><th>Total (₹)</th><th>Reason</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx._id}>
                <td>{tx._id.slice(-6)}</td>
                <td><Badge bg={tx.type === "Added" ? "success" : "danger"}>{tx.type}</Badge></td>
                <td>{tx.to}</td>
                <td>{tx.creditType}</td>
                <td>{tx.count}</td>
                <td>{tx.rate}</td>
                <td>{tx.total}</td>
                <td>{tx.reason || "-"}</td>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="table-light fw-bold">
              <td colSpan="4">Total (Added Credits)</td>
              <td>{totalSummary.credits}</td>
              <td></td>
              <td>₹ {totalSummary.amount.toFixed(2)}</td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </Table>
      )}
    </div>
  );
};

export default CreditsPage;
