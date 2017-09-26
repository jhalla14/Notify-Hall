const twilio = require('twilio')
const env = require('./../config.js')
const got = require('got')

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || env.TWILIO_AUTH_TOKEN
const NOTIFY_SERVICE_SID = process.env.TWILIO_NOTIFY_SERVICE_SID || env.TWILIO_NOTIFY_SERVICE_SID
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || env.FB_ACCESS_TOKEN

client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) //setup Twilio Client
notifyService = client.notify.services(NOTIFY_SERVICE_SID) //setup Notify Service

/* Helper function to create a Binding */
function createBinding(identity, type, address, tags) {
  //sort through the tags to attach to the binding
  return new Promise((resolve, reject) => {
    let tagArray = []
    tags.forEach((tag) => {
      tagArray.push(tag)
    })
    notifyService.bindings.create({
      identity: identity,
      bindingType: type,
      address: address,
      tag: tagArray
    }).then((binding) => {
      console.log('Helper: createBinding: success', binding);
      resolve(binding)
    }).catch((error) => {
      console.log('Helper: createBinding: error', error);
      reject(error)
    })
  })
}

module.exports.createBinding = createBinding

/* Helper function to delete a binding */
function deleteBinding(sid) {
  notifyService.bindings(sid).remove().then((wasRemoved) => {
    console.log('Helper: deleteBinding: wasRemoved: ', wasRemoved);
  }).catch((errorMessage) => {
    console.log('Helper: deleteBinding: error: ', errorMessage);
  })
}

module.exports.deleteBinding = deleteBinding

/* Helper function to delete User by first deleting all of their bindings
and then the User Obejct */
function deleteUser(sid) {
  const removeBindings = async() => {
    await notifyService.users(sid).bindings.list().then((bindings) => {
      bindings.forEach((binding) => {
        deleteBinding(binding.sid)
      })
    }).catch((errorMessage) => {
      console.log("helper: deleteUser: deleteBinding: error:", errorMessage);
    })
  }

  removeBindings().then(() => {
    notifyService.users(sid).remove().then((wasRemoved) => {
          console.log("helper: deleteUser: success:", wasRemoved);
        })
  })
}

module.exports.deleteUser = deleteUser

/* Helper function to add an User to a Segment */
function addToSegment(identity, segment) {
  notifyService.users(identity).segmentMemberships.create({
    segment: segment
  }).then((segment_membership) => {
    console.log("helper: addToSegment: success", segment_membership.sid);
  }).catch((errorMessage) => {
    console.log("helper: addToSegment: error", errorMessage);
  }).done()
}

module.exports.addToSegment = addToSegment

/* Helper function to send an SMS message */
function sendMessage(from, to, body) {
  client.messages.create({
    to: to,
    from: from,
    body: body
  }).then((message) => {
    console.log("helper: sendMessage: success:", message.sid);
  }).catch((errorMessage) => {
    console.log(errorMessage);
  })
}

module.exports.sendMessage = sendMessage

/* Fetch Users Promise */
function fetchUsers(segment){
  return new Promise((resolve, reject) => {
    notifyService.users.list({
      segment: segment
    }).then((users) => {
      resolve(users)
    }).catch((error) => {
      console.log("helper: fetchUsers: error: ", error);
      reject(error)
    }).done()
  })
}

module.exports.fetchUsers = fetchUsers

/* Fetch Bindings Promise */
function fetchBindings(user) {
  return new Promise((resolve, reject) => {
    notifyService.users(user.identity).bindings.list().then((bindings) => {
      resolve(bindings)
    })
  }).catch((errorMessage) => {
    console.log("helper: fetchBindings: error: ", user, errorMessage);
    reject(errorMessage)
  })
}

module.exports.fetchBindings = fetchBindings


/* Only fetch bindings with a particular tag */
function fetchBindingsWithTag(tag) {
  return new Promise((resolve, reject) => {
    notifyService.bindings.list({
      tag:tag
    }).then((bindings) => {
      console.log("helper: fetchBindingsWithTag: success:", bindings);
      resolve(bindings)
    }).catch((errorMessage) => {
      console.log("helper: fetchBindingsWithTag: error:", errorMessage);
      reject(errorMessage)
    }).done()
  })
}

module.exports.fetchBindingsWithTag = fetchBindingsWithTag


/* Fetch All Bindings */
function fetchAllBindings() {
  return new Promise((resolve, reject) => {
    notifyService.bindings.list().then((bindings) => {
      console.log("helper: fetchAllBindings: success: ", bindings);
      resolve(bindings)
    })
  }).catch((errorMessage) => {
    console.log("helper: fetchAllBinding: error:", errorMessage);
    reject(errorMessage)
  })
}

module.exports.fetchAllBindings = fetchAllBindings

/* Create a Notify User*/
function createUser(identity, segments) {
  return new Promise((resolve, reject) => {
    notifyService.users.create({
      identity: identity,
      segment: segments
    }).then((user) => {
      console.log("helper: createUser: success", user.sid, user.segments);
      resolve(user)
    }).catch((errorMessage) => {
      console.log("helper: createUser: error", errorMessage);
      reject(errorMessage)
    })
  })
}

module.exports.createUser = createUser

/* Fetch Segments */
function fetchSegments() {
  return new Promise((resolve, reject) => {
    notifyService.segments.list().then((segments) => {
      var segmentsArray = []
      segments.forEach((segment) => {
        segmentsArray.push(segment.uniqueName)
      })

      resolve(segmentsArray)
    }).catch((errorMessage) => {
      reject("helper: fetchSegments: error", errorMessage)
    }).done()
  })
}

module.exports.fetchSegments = fetchSegments

/* Fetch Segments for a particular User */
function fetchSegmentsForUser(user) {
  return new Promise((resolve, reject) => {
    notifyService.segments.list().then((segments) => {
      var segmentsArray = []
      segments.forEach((segment) => {
        if (segment.uniqueName.includes(user)) {
          segmentsArray.push(segment.uniqueName)
        }
      })
      resolve(segmentsArray)
    }).catch((errorMessage) => {
      console.log("helper: fetchSegmentsForUser: error", errorMessage);
      reject("helper: fetchSegmentsForUser: error", errorMessage)
    })
  })
}

module.exports.fetchSegmentsForUser = fetchSegmentsForUser

/* Fetch Admin Consol Data for a particular User */
const fetchConsoleData = async(user, segment) => {

  // fetch only the Users, Segments, and Bindings associated with this segment
  const segments = await fetchSegmentsForUser(segment)
  const users = await fetchUsers(segment) //fetch users only of this segment
  const taggedBindings = await fetchBindingsWithTag(segment)

  let data = new Map() // map to store the return data
  data.set("segments", segments)
  data.set("users", users)
  data.set("bindings", taggedBindings)

  return data
}

module.exports.fetchConsoleData = fetchConsoleData

/* Retrieve a Notify User */
function retrieveNotifyUser(identity) {
  return new Promise((resolve, reject) => {
    notifyService.users(identity).fetch().then((user) => {
      resolve(user)
    }).catch((errorMessage) => {
      console.log("ERROR FETCHING USER FROM NOTIFY", errorMessage);
      reject(errorMessage)
    }).done()
  })
}

module.exports.retrieveNotifyUser = retrieveNotifyUser

/* Retrieve Notify Bindings for a User */
function retrieveNotifyBindings(identity, tag) {
  return new Promise((resolve, reject) => {
    notifyService.users(identity).bindings.list({
      bindingType: tag,
      tag: tag
    }).then((bindings) => {
      resolve(bindings)
    }).catch((errorMessage) => {
      console.log("helper: retrieveNotifyBindings: error", errorMessage);
      reject(errorMessage)
    }).done()
  })
}

module.exports.retrieveNotifyBindings = retrieveNotifyBindings

/* Remove a User from a Segment */
function removeSegment(identity, segment) {
    notifyService.users(identity).segmentMemberships(segment).remove().then((success) =>{
      console.log("helper: removeSegment: success", success);
    }).catch((errorMessage) => {
      console.log("helper: removeSegment: error", errorMessage);
    }).done()
}

module.exports.removeSegment = removeSegment


/* Send a Notification to a Segment with a Body */
function sendNotification(segment, body) {
  return new Promise((resolve, reject) => {
    notifyService.notifications.create({
      'segment': segment,
      'body': body
    }).then((notification) => {
      console.log("helper: sendNotfication: success: ", notification.sid);
      resolve(notification)
    }).catch((errorMessage) => {
      console.log("helper: sendNotification: error: ", errorMessage);
      reject(errorMessage)
    })
  })
}

module.exports.sendNotification = sendNotification

/* Send a Notification with a custom payload. Custom payloads may include Content
sepecific messages as well as additional attributes to orchestrate between channels */
function sendNotificationWithPayload(segment, payload, tags) {
  return new Promise((resolve, reject) => {
    console.log("helper: sendNotificationWithPayload: ", payload, tags);
    var body = ''
    var sms = ''
    var apnBody = ''
    var apnTitle = ''
    var fb = ''

    // general message field overrides all other fields
    if (payload.message) {
      body = payload.message
      sms = payload.message
      apnBody = payload.message
      fb = payload.fb
    }

    // override SMS message
    if (payload.sms) {
      body = payload.sms
      sms = payload.sms
    }

    if (payload.apnTitle) {
      apnTitle = payload.apnTitle
    }

    if (payload.apnBody) {
      apnBody = payload.apnBody
    }

    if (payload.fb) {
      fb = payload.fb
    }

    notifyService.notifications.create({
      'segment': segment,
      'body': body,
      'sms': `{"body":"${sms}"}`,
      'apn': `{"aps":{"alert": {"title": "${apnTitle}", "body":"${apnBody}"}}}`,
      'facebookMessenger': `{"message": {"text": "${fb}"}}`,
      'tag': tags
    }).then((notification) => {
      resolve(notification)
    }).catch((errorMessage) => {
      reject(errorMessage)
    })
  })
}

module.exports.sendNotificationWithPayload = sendNotificationWithPayload

function generateParametricMessengerCode(referral, segment) {
  return new Promise ((resolve, reject) => {
    const url = "https://graph.facebook.com/v2.6/me/messenger_codes"

    // replace @ symbole because Messneger Code API valid characters are a-z A-Z 0-9 +/=-.:_
    const newReferral = referral.replace("@",":")
    const ref = [newReferral, segment].join("+_") // combine into one string conntected by +-

    // HTTP Request Options
    const options = {
    method: 'POST',
    json: true,
    query: {"access_token": FB_ACCESS_TOKEN},
    body: {
      "image_size": 1000,
      "type": "standard",
      "data": {
              "ref": ref
            }
    }
  };

    got(url, options)
  	.then((response) => {
      const uri = response.body.uri
      console.log("helper: generateParametricMessengerCode: success", uri);
      resolve(uri)
  	}).catch((error) => {
  		console.log(error.response.body);
      const json = JSON.parse(error.response.body)
      console.log("helper: generateParametricMessengerCode: error", json.error);
      reject(json.error)
  	});
    })
}

module.exports.generateParametricMessengerCode = generateParametricMessengerCode
