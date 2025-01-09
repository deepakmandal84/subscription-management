import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Fab,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Add, Edit, Email } from '@mui/icons-material';
import axios from 'axios';

const App = () => {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'Monthly', // Default plan
    startDate: dayjs('2025-01-01'), // Default start date
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = 'http://localhost:3000'; // Replace with your backend URL.

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${backendUrl}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch all payments
  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${backendUrl}/payments`);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  // Add a new user
  const addUser = async () => {
    try {
      const payload = {
        ...newUser,
        startDate: newUser.startDate.format('YYYY-MM-DD'), // Format date for the backend
      };
      await axios.post(`${backendUrl}/users`, payload);
      setMessage('User added successfully!');
      setNewUser({ name: '', email: '', phone: '', plan: 'Monthly', startDate: dayjs('2025-01-01') });
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      setMessage('Error adding user.');
    }
  };

  // Open edit dialog
  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  // Save edited user
  const saveEdit = async () => {
    try {
      const { id, ...updatedUser } = selectedUser;
      await axios.put(`${backendUrl}/users/${id}`, updatedUser);
      setMessage('User updated successfully!');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage('Error updating user.');
    }
  };

  // Send email notification
  const sendEmailNotification = async (user) => {
    try {
      await axios.post(`${backendUrl}/send-email`, { userId: user.id });
      setMessage(`Email sent to ${user.name}`);
    } catch (error) {
      console.error('Error sending email:', error);
      setMessage('Error sending email.');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPayments();
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f7f9fc', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#3f51b5' }}>
        Subscription Management
      </Typography>

      {/* Add User Section */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
        <Typography variant="h6" gutterBottom>
          Add User
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Phone"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Plan</InputLabel>
              <Select
                value={newUser.plan}
                onChange={(e) => setNewUser({ ...newUser, plan: e.target.value })}
              >
                <MenuItem value="Monthly">Monthly</MenuItem>
                <MenuItem value="Quarterly">Quarterly</MenuItem>
                <MenuItem value="Semi-Annually">Semi-Annually</MenuItem>
                <MenuItem value="Annually">Annually</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={newUser.startDate}
                onChange={(newValue) => setNewUser({ ...newUser, startDate: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs="auto">
            <Fab color="primary" size="small" onClick={addUser}>
              <Add />
            </Fab>
          </Grid>
        </Grid>
      </div>

      {/* User List Section */}
      <Typography variant="h6" gutterBottom>
        Users
      </Typography>
      <TableContainer component={Paper} style={{ marginBottom: '20px' }}>
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
                <TableCell>{user.Subscription?.plan || 'N/A'}</TableCell>
                <TableCell>{user.Subscription?.startDate || 'N/A'}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => sendEmailNotification(user)}>
                    <Email />
                  </IconButton>
                  <IconButton color="secondary" onClick={() => handleEdit(user)}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment History Section */}
      <Typography variant="h6" gutterBottom>
        Payment History
      </Typography>
      <Grid container spacing={3}>
        {payments.map((payment) => (
          <Grid item xs={12} sm={6} md={4} key={payment.id}>
            <Card>
              <CardHeader title={`Payment by ${payment.User?.name || 'Unknown'}`} />
              <CardContent>
                <Typography>Amount: ${payment.amount}</Typography>
                <Typography>Status: {payment.status}</Typography>
                <Typography>Date: {payment.paymentDate}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={selectedUser?.name || ''}
            onChange={(e) =>
              setSelectedUser({ ...selectedUser, name: e.target.value })
            }
            margin="normal"
            fullWidth
          />
          <TextField
            label="Email"
            value={selectedUser?.email || ''}
            onChange={(e) =>
              setSelectedUser({ ...selectedUser, email: e.target.value })
            }
            margin="normal"
            fullWidth
          />
          <TextField
            label="Phone"
            value={selectedUser?.phone || ''}
            onChange={(e) =>
              setSelectedUser({ ...selectedUser, phone: e.target.value })
            }
            margin="normal"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={saveEdit} variant="contained">
            Save
          </Button>
          <Button onClick={() => setEditDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Section */}
      {message && <Typography style={{ marginTop: '20px', color: 'green' }}>{message}</Typography>}
    </div>
  );
};

export default App;
