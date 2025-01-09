import React, { useState, useEffect } from "react";
import {
  Typography,
  Tabs,
  Tab,
  Box,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Add, Edit, Email, Payment } from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import axios from "axios";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import './App.css';

const stripePromise = loadStripe("pk_test_51QeApeKQyYQHPnZvtoMVN0OPdcqEzU7d87QlNKL6GnswMTMzLhWh53b2ClRJOFPp5lfNtQMb91aCcCf6YF8sFg7200WYMcWFuu"); // Replace with your Stripe publishable key

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ marginTop: "20px" }}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const PaymentForm = ({ email, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    try {
      const { data } = await axios.post("http://localhost:3000/payments", {
        email,
        amount,
      });

      const { clientSecret } = data;
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setMessage(`Payment failed: ${result.error.message}`);
      } else if (result.paymentIntent.status === "succeeded") {
        setMessage("Payment successful!");
        onSuccess();
      }
    } catch (error) {
      setMessage("Error processing payment. Please try again.");
    }
  };

  return (
    <form onSubmit={handlePayment} style={{ padding: "20px" }}>
      <CardElement />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={!stripe}
        startIcon={<Payment />}
        style={{ marginTop: "20px" }}
      >
        Pay ${amount}
      </Button>
      {message && <Typography style={{ marginTop: "10px" }}>{message}</Typography>}
    </form>
  );
};

const App = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [paidUsers, setPaidUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
    startDate: dayjs("2025-01-01"),
  });
  const [paymentDetails, setPaymentDetails] = useState({ email: "", amount: "" });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const backendUrl = "http://localhost:3000"; // Replace with your backend URL

  const fetchUsers = async () => {
    const response = await axios.get(`${backendUrl}/users`);
    setUsers(response.data);
  };

  const fetchPlans = async () => {
    const response = await axios.get(`${backendUrl}/plans`);
    setPlans(response.data);
  };

  const fetchPaidUsers = async () => {
    const response = await axios.get(`${backendUrl}/paid-users`);
    setPaidUsers(response.data);
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchPaidUsers();
  }, []);

  const handleAddUser = async () => {
    const payload = {
      ...newUser,
      startDate: newUser.startDate.format("YYYY-MM-DD"),
    };
    await axios.post(`${backendUrl}/users`, payload);
    setNewUser({
      name: "",
      email: "",
      phone: "",
      planId: "",
      startDate: dayjs("2025-01-01"),
    });
    fetchUsers();
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f7f9fc", minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom style={{ textAlign: "center" }}>
        Subscription Management
      </Typography>
      <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} centered>
        <Tab label="Add User" />
        <Tab label="View/Edit Users" />
        <Tab label="Make Payment" />
        <Tab label="Paid Users" />
      </Tabs>

      <TabPanel value={tabIndex} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField
              label="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              label="Phone"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth>
              <InputLabel>Plan</InputLabel>
              <Select
                value={newUser.planId}
                onChange={(e) => setNewUser({ ...newUser, planId: e.target.value })}
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.plan}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={newUser.startDate}
                onChange={(newValue) => setNewUser({ ...newUser, startDate: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleAddUser}
              startIcon={<Add />}
              style={{ marginTop: "10px" }}
            >
              Add User
            </Button>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        <Typography variant="h6">Users</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.SubscriptionPlan?.plan || "N/A"}</TableCell>
                  <TableCell>{new Date(user.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button>
                      <Edit />
                    </Button>
                    <Button>
                      <Email />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabIndex} index={2}>
        <Typography variant="h6">Make Payment</Typography>
        <Grid container spacing={2}>
          <Grid item xs={5}>
            <TextField
              label="Email"
              value={paymentDetails.email}
              onChange={(e) =>
                setPaymentDetails({ ...paymentDetails, email: e.target.value })
              }
              fullWidth
            />
          </Grid>
          <Grid item xs={5}>
            <TextField
              label="Amount"
              type="number"
              value={paymentDetails.amount}
              onChange={(e) =>
                setPaymentDetails({ ...paymentDetails, amount: e.target.value })
              }
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              variant="contained"
              onClick={() => setShowPaymentForm(true)}
              startIcon={<Payment />}
            >
              Pay Now
            </Button>
          </Grid>
        </Grid>
        {showPaymentForm && (
          <Elements stripe={stripePromise}>
            <PaymentForm
              email={paymentDetails.email}
              amount={paymentDetails.amount}
              onSuccess={() => {
                fetchPaidUsers();
                setShowPaymentForm(false);
              }}
            />
          </Elements>
        )}
      </TabPanel>

      <TabPanel value={tabIndex} index={3}>
        <Typography variant="h6">Paid Users</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Payment Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paidUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.SubscriptionPlan?.plan || "N/A"}</TableCell>
                  <TableCell>{`$${user.PaymentDetails[0]?.amount || "N/A"}`}</TableCell>
                  <TableCell>
                    {user.PaymentDetails[0]?.paymentDate
                      ? new Date(user.PaymentDetails[0].paymentDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </div>
  );
};

export default App;
