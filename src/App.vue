<template>
  <div id="app">
    <div class="btns flex justify-center" v-if="!findPc($socket.id)">
      <button @click="init('getDisplayMedia')">Экран</button>
      <button @click="init('getUserMedia')">Вебкамера</button>
    </div>
    <div class="container flex flex-wrap">
      <div v-for="pc in peerConnections" :key="pc.id" class="flex stream">
        <div>
          <video :srcObject.prop="pc.stream" autoplay class="video"></video>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  data: () => ({
    pcConfig: {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    },
    room: null,
    peerConnections: []
  }),

  sockets: {
    join(settings) {
      console.log('JOIN')
      this.setUpPeer(settings)

      const {stream, pc, ...mySettings} = this.findPc(this.$socket.id)
      this.$socket.emit('createOffer', {
        dest: settings.id,
        ...mySettings
      })
    },
    createOffer(settings) {
      console.log('CREATE OFFER')
      this.setUpPeer(settings)
      this.findPc(settings.id)
        .pc.createOffer()
        .then(description => this.createdDescription(description, settings.id))
        .catch(this.errorHandler)
    },
    description({id, sdp}) {
      console.log('DESCRIPTION')
      this.findPc(id)
        .pc.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => {
          if (sdp.type == 'offer') {
            this.findPc(id)
              .pc.createAnswer()
              .then(description => this.createdDescription(description, id))
              .catch(this.errorHandler)
          }
        })
        .catch(this.errorHandler)
    },
    iceCandidate({id, ice}) {
      console.log('ICE_CANDIDATE')
      this.findPc(id)
        .pc.addIceCandidate(new RTCIceCandidate(ice))
        .catch(this.errorHandler)
    }
  },

  mounted() {
    this.$router.push('/test')
  },

  methods: {
    init(method) {
      this.room = location.pathname.replace('/', '')

      const constraints = {
        video: true,
        audio: true
      }

      navigator.mediaDevices[method](constraints)
        .then(this.setStream)
        .catch(function(e) {
          console.log('getUserMedia() error: ' + e.name)
        })
    },
    setStream(stream) {
      const settings = {
        id: this.$socket.id,
        room: this.room
      }
      this.peerConnections.push({
        stream,
        ...settings
      })
      this.$socket.emit('join', settings)
    },
    setUpPeer(settings) {
      // console.log('SET UP PEER')
      const player = {
        ...settings,
        pc: new RTCPeerConnection(this.pcConfig)
      }
      this.peerConnections.push(player)
      player.pc.onicecandidate = event => this.gotIceCandidate(event, settings.id)
      player.pc.onaddstream = event => this.handleRemoteStreamAdded(event, settings.id)
      player.pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(event, settings.id)

      const {stream} = this.findPc(this.$socket.id)
      player.pc.addStream(stream)
    },
    createdDescription(description, id) {
      this.findPc(id)
        .pc.setLocalDescription(description)
        .then(() => {
          this.$socket.emit('description', {
            sdp: this.findPc(id).pc.localDescription,
            id: this.$socket.id,
            dest: id,
            room: this.room
          })
        })
        .catch(this.errorHandler)
    },
    handleRemoteStreamAdded(event, id) {
      console.log('REMOTE_STREAM_ADDED')
      this.$set(this.findPc(id), 'stream', event.stream)
    },
    gotIceCandidate(event) {
      if (event.candidate != null) {
        this.$socket.emit('iceCandidate', {
          ice: event.candidate,
          id: this.$socket.id,
          room: this.room
        })
      }
    },
    checkPeerDisconnect(event, id) {
      const state = this.findPc(id).pc.iceConnectionState
      console.log(`connection with peer ${id} ${state}`)
      if (['failed', 'closed', 'disconnected'].includes(state)) {
        this.peerConnections = this.peerConnections.filter(pc => pc.id !== id)
      }
    },
    errorHandler(e) {
      console.error(e)
    },
    findPc(id) {
      return this.peerConnections.find(pc => pc.id === id)
    }
  }
}
</script>

<style>
/*#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 20px;
}*/

.btns {
  margin-bottom: 8px;
}

.flex {
  display: flex;
}

.flex-wrap {
  flex-wrap: wrap;
}

.justify-center {
  justify-content: center;
}

.stream {
  flex-basis: 25%;
  max-width: 25%;
  justify-content: center;
}

.stream > div {
  padding: 0 8px;
}

.video {
  max-height: 300px;
  max-width: 100%;
}
</style>
