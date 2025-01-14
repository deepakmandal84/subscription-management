// App.js
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
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  Add,
  Edit,
  Email,
  Payment,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import axios from "axios";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme"; // import our custom theme
import "./App.css";

const stripePromise = loadStripe("your_stripe_publishable_key");

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
    <Box sx={{ padding: 2 }}>
      <form onSubmit={handlePayment} style={{ padding: "20px" }}>
        <CardElement />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!stripe}
          startIcon={<Payment />}
          sx={{ marginTop: 2 }}
        >
          Pay ${amount}
        </Button>
        {message && (
          <Typography sx={{ marginTop: 1 }} color="error">
            {message}
          </Typography>
        )}
      </form>
    </Box>
  );
};

const App = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [paidUsers, setPaidUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
    startDate: dayjs("2025-01-01"),
  });
  const [paymentDetails, setPaymentDetails] = useState({
    email: "",
    amount: "",
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const backendUrl = "http://localhost:3000";

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
  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // Save edited user
  const saveEdit = async () => {
    try {
      const { id, ...updatedUser } = selectedUser;
      await axios.put(`${backendUrl}/users/${id}`, updatedUser);
      setMessage("User updated successfully!");
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage("Error updating user.");
    }
  };

  // Send email notification
  const sendEmailNotification = async (user) => {
    try {
      await axios.post(`${backendUrl}/send-reminders`, { userId: user.id });
      setMessage(`Email sent to ${user.name}`);
    } catch (error) {
      console.error("Error sending email:", error);
      setMessage("Error sending email.");
    }
  };

  return (
    <ThemeProvider theme={theme}>
      {/* Background Graphics (optional) */}
      <div className="background-graphics" />

      {/* AppBar (Navigation) */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Subscription Management
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={2} sx={{ p: 2 }}>
          {/* Tabs */}
          <Tabs
            value={tabIndex}
            onChange={(e, newValue) => setTabIndex(newValue)}
            centered
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Add User" />
            <Tab label="View/Edit Users" />
            <Tab label="Make Payment" />
            <Tab label="Paid Users" />
          </Tabs>

          {/* Add User Tab */}
          <TabPanel value={tabIndex} index={0}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Phone"
                  value={newUser.phone}
                  onChange={(e) =>
                    setNewUser({ ...newUser, phone: e.target.value })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={newUser.planId}
                    onChange={(e) =>
                      setNewUser({ ...newUser, planId: e.target.value })
                    }
                  >
                    {plans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        {plan.plan}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Start Date"
                    value={newUser.startDate}
                    onChange={(newValue) =>
                      setNewUser({ ...newUser, startDate: newValue })
                    }
                    renderInput={(params) => (
                      <TextField {...params} fullWidth />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleAddUser}
                  startIcon={<Add />}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Add User
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* View/Edit Users Tab */}
          <TabPanel value={tabIndex} index={1}>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                      <TableCell>
                        {user.SubscriptionPlan?.plan || "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(user.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="secondary"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          color="primary"
                          onClick={() => sendEmailNotification(user)}
                        >
                          <Email />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Edit User Dialog */}
            <Dialog
              open={editDialogOpen}
              onClose={() => setEditDialogOpen(false)}
            >
              <DialogTitle>Edit User</DialogTitle>
              <DialogContent>
                <TextField
                  label="Name"
                  value={selectedUser?.name || ""}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, name: e.target.value })
                  }
                  margin="normal"
                  fullWidth
                />
                <TextField
                  label="Email"
                  value={selectedUser?.email || ""}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, email: e.target.value })
                  }
                  margin="normal"
                  fullWidth
                />
                <TextField
                  label="Phone"
                  value={selectedUser?.phone || ""}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, phone: e.target.value })
                  }
                  margin="normal"
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={selectedUser?.planId}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        planId: e.target.value,
                      })
                    }
                  >
                    {plans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        {plan.plan}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={saveEdit} variant="contained">
                  Save
                </Button>
                <Button
                  onClick={() => setEditDialogOpen(false)}
                  variant="outlined"
                >
                  Cancel
                </Button>
              </DialogActions>
            </Dialog>

            {/* Message Section */}
            {message && (
              <Typography style={{ marginTop: "20px", color: "green" }}>
                {message}
              </Typography>
            )}
          </TabPanel>

          {/* Make Payment Tab */}
          <TabPanel value={tabIndex} index={2}>
            {/* Example Payment Flow */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  value={paymentDetails.email}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      email: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount"
                  type="number"
                  value={paymentDetails.amount}
                  onChange={(e) =>
                    setPaymentDetails({
                      ...paymentDetails,
                      amount: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Payment />}
                  onClick={() => setShowPaymentForm(true)}
                >
                  Proceed to Payment
                </Button>
              </Grid>
            </Grid>

            {showPaymentForm && (
              <Box sx={{ mt: 4 }}>
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    email={paymentDetails.email}
                    amount={paymentDetails.amount}
                    onSuccess={() => {
                      setShowPaymentForm(false);
                      // Optionally refresh data or show success UI
                    }}
                  />
                </Elements>
              </Box>
            )}
          </TabPanel>

          {/* Paid Users Tab */}
          <TabPanel value={tabIndex} index={3}>
            <Typography variant="h6">Paid Users</Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                      <TableCell>
                        {user.SubscriptionPlan?.plan || "N/A"}
                      </TableCell>
                      <TableCell>
                        {user.PaymentDetails[0]?.amount
                          ? `$${user.PaymentDetails[0].amount}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {user.PaymentDetails[0]?.paymentDate
                          ? new Date(
                              user.PaymentDetails[0].paymentDate
                            ).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default App;
