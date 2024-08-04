export const chat = (req, res) => {
    // Access user information from req.user
    const user = req.user;
    console.log('User:', user); // Log the user for debugging
    
    // Handle chat logic here
    res.send(`Hello ${user.display_name}, your status is ${user.status}`);
  };
  