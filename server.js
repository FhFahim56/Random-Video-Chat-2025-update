const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', () => {
    if (waitingUser) {
      io.to(waitingUser).emit('match', socket.id);
      socket.emit('match', waitingUser);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket.id) waitingUser = null;
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
