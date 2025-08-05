import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Table,
  Badge,
  Form,
  Row,
  Col,
  Button,
  Card,
  Alert,
  Spinner,
} from "react-bootstrap";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { utils, writeFile } from "xlsx";
import { useNavigate } from "react-router-dom";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    user: "",
    creditType: "",
    fromDate: "",
    toDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const config = getAuthHeaders();
      if (!config.headers) {
          setError("You are not logged in. Please log in again.");
          setTimeout(() => navigate("/login"), 2000);
          return;
      }

      const [transactionsRes, usersRes] = await Promise.all([
        axios.get("https://messagemaster-backend.onrender.com/api/credits", config),
        axios.get("https://messagemaster-backend.onrender.com/api/users", config),
      ]);
      setTransactions(transactionsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchUser = filters.user ? tx.to === filters.user : true;
    const matchType = filters.creditType
      ? tx.creditType === filters.creditType
      : true;
    const txDate = new Date(tx.createdAt);
    const fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
    const toDate = filters.toDate ? new Date(filters.toDate) : null;
    const matchFrom = fromDate ? txDate >= fromDate : true;
    const matchTo = toDate ? txDate <= toDate : true;
    return matchUser && matchType && matchFrom && matchTo;
  });

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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Credit Transactions", 14, 10);
    doc.autoTable({
      head: [
        [
          "ID", "Type", "To", "Credit Type", "Count", "Rate (₹)", "Total (₹)", "Reason", "Time",
        ],
      ],
      body: filteredTransactions.map((tx) => [
        tx._id, tx.type, tx.to, tx.creditType, tx.count, tx.rate, tx.total, tx.reason || "-", new Date(tx.createdAt).toLocaleString(),
      ]),
      startY: 15,
      styles: { fontSize: 8 },
    });
    doc.save("transaction_history.pdf");
  };

  const exportToExcel = () => {
    const sheet = utils.json_to_sheet(
      filteredTransactions.map((tx) => ({
        ID: tx._id, Type: tx.type, To: tx.to, "Credit Type": tx.creditType, Count: tx.count,
        "Rate (₹)": tx.rate, "Total (₹)": tx.total, Reason: tx.reason || "-", Time: new Date(tx.createdAt).toLocaleString(),
      }))
    );
    const wb = utils.book_new();
    utils.book_append_sheet(wb, sheet, "Transactions");
    writeFile(wb, "transaction_history.xlsx");
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📜 Transaction History</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="p-3 mb-4 shadow-sm">
        <Row className="g-3">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Select User</Form.Label>
              <Form.Select
                value={filters.user}
                onChange={(e) =>
                  setFilters({ ...filters, user: e.target.value })
                }
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u._id} value={u.email}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={3}>
            <Form.Group>
              <Form.Label>Credit Type</Form.Label>
              <Form.Control
                type="text"
                placeholder="Filter by Credit Type"
                value={filters.creditType}
                onChange={(e) =>
                  setFilters({ ...filters, creditType: e.target.value })
                }
              />
            </Form.Group>
          </Col>

          <Col md={2}>
            <Form.Group>
              <Form.Label>From Date</Form.Label>
              <Form.Control
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </Form.Group>
          </Col>

          <Col md={2}>
            <Form.Group>
              <Form.Label>To Date</Form.Label>
              <Form.Control
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </Form.Group>
          </Col>

          <Col md={2} className="d-flex align-items-end">
            <Button
              variant="outline-secondary"
              onClick={() =>
                setFilters({
                  user: "",
                  creditType: "",
                  fromDate: "",
                  toDate: "",
                })
              }
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      <div className="d-flex justify-content-between mb-2">
        <h5>Transactions</h5>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-2"
            onClick={exportToPDF}
          >
            ⬇️ Export PDF
          </Button>
          <Button
            variant="outline-success"
            size="sm"
            onClick={exportToExcel}
          >
            📊 Export Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>User</th>
              <th>Credit Type</th>
              <th>Count</th>
              <th>Rate (₹)</th>
              <th>Total (₹)</th>
              <th>Reason</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx, index) => (
              <tr key={tx._id}>
                <td>{index + 1}</td>
                <td>
                  <Badge
                    bg={tx.type === "Added" ? "success" : "danger"}
                    className="px-3 py-2"
                  >
                    {tx.type}
                  </Badge>
                </td>
                <td>{tx.to}</td>
                <td>{tx.creditType}</td>
                <td>{tx.count}</td>
                <td>{tx.rate}</td>
                <td>₹ {tx.total}</td>
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

export default TransactionHistory;
