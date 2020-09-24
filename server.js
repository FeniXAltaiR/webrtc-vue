const http = require('http')
const app = http.createServer()
const io = require('socket.io')(app)

io.on('connection', socket => {
  socket.on('test', () => {
    socket.emit('test')
  })

  socket.on('join', async settings => {
    const {room} = settings

    socket.join(room)
    socket.to(room).emit('join', settings)
  })

  socket.on('createOffer', ({dest, ...settings}) => {
    socket.to(dest).emit('createOffer', settings)
  })

  socket.on('description', ({id, dest, sdp}) => {
    socket.to(dest).emit('description', {
      sdp,
      id
    })
  })

  socket.on('iceCandidate', message => {
    socket.to(message.room).emit('iceCandidate', message)
  })
})

app.listen(7000)