// theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#3f51b5",  // Purple-ish
    },
    secondary: {
      main: "#f50057",  // Pink accent
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif", // or 'Roboto', etc.
    h4: {
      fontWeight: 700,
      letterSpacing: "0.5px",
    },
  },
  shape: {
    borderRadius: 8, // Larger default radii for cards & buttons
  },
});

export default theme;
