const express = require('express')
const hbs = require('hbs')
const env = require('./config.js')
const bodyParser = require('body-parser')
const helper = require('./util/helper.js')
var PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const passport = require('passport')
var GoogleStrategy = require('passport-google-oauth20').Strategy;

var app = express()
hbs.registerPartials(__dirname + '/views/partials')
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views')
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json()) //parse application/json
app.use(bodyParser.urlencoded({extended: false})) //parse application/x-www-form-urlencoded

const PORT = process.env.PORT || 3000
const SECRET = process.env.SECRET || env.SECRET

app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize())
app.use(passport.session());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || env.CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || env.CLIENT_SECRET
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || env.CALLBACK_URL

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
  },
  function(req, token, tokenSecret, profile, cb) {
    cb(null, extractProfile(profile));
  }
));

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

/* Extract Profile Information from Google Sign In */
function extractProfile (profile) {
  let imageUrl = '';
  let admin = false
  let emailAddress = ''
  if (profile.photos && profile.photos.length) {
    imageUrl = profile.photos[0].value;
  }

  // set to match custom domain
  profile.emails.forEach((email) => {
    emailAddress = email.value
    if (email.value.match(/\.*@INSERT_YOUR_ADMIN_DOMAIN_HERE.com$/)) {
      admin = true
    }
  })

  return {
    id: profile.id,
    displayName: profile.displayName,
    image: imageUrl,
    admin: admin,
    email: emailAddress
  };
}

//Auth middle to make sure the user is logged in to access particular routes
function authRequired (req, res, next) {
  if (!req.user) {
    let se = req.params.se
    req.session.oauth2return = req.originalUrl;
    return res.redirect(`/${se}/login`);
  }
  next();
}

app.get('/auth/google/', function(req,res,next){
    req._toParam = req.query.se
    passport.authenticate(
        'google', { scope : ['email', 'profile'], state: req.query.se
      }
    )(req,res,next);
})

app.get('/auth/google/callback/',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    const user = req.user
    console.log("USEr", user);
    //redirect to Admin
    if (user.admin) {
      res.redirect(`/${req.query.state}/console/${user.email}`)
    } else {
      //redirect to Profile
      res.redirect(`/${req.query.state}/profile/${user.email}`);
    }
});

// load home page
app.get('/', (req, res) => {
  res.render('home.hbs', {
    login: true
  })
})

app.get('/:se', (req, res) => {
  const se = req.params.se
  res.render('home.hbs', {
    login: true,
    salesEngineer: se
  })
})

app.get('/:se/login', (req, res) => {
  const se = req.params.se
  res.render('login.hbs', {
    login: false,
    salesEngineer: se
  })
})

app.get('/:se/logout', (req, res) => {
  const se = req.params.se
  req.logout() //actually log the user out of their passport session
  res.redirect(`/${se}`)
})

// Login route for every SE to use when demoing for their own sandbox
app.get('/:se/login', (req, res) => {
  const se = req.params.se
  res.render('login.hbs', {
    login: false,
    salesEngineer: se
  })
})

app.get('/logout', (req, res) => {
  res.redirect('/')
})

app.post('/:se/console/submit/custom/:identity', (req, res) => {
  const se = req.params.se
  const identity = req.params.identity
  const body = req.body
  const segment = req.body.segment
  const message = req.body.message

  const smsMessage = req.body.modalSms
  const iosMessageTitle = req.body.modalIosTitle
  const iosMessageBody = req.body.modalIosBody
  const fbMessage = req.body.modalFbMessenger

  let preferred = req.body.modalPreferred
  let all = req.body.modalAll

  let payload = {}
  let tags = []

  if (all) {
    tags.push('all')
  }
  if (preferred) {
    tags.push('preferred')
  }

  if (message) {
    payload.message = message
  }

  if (smsMessage) {
    payload.sms = smsMessage
  }

  if (iosMessageTitle) {
    payload.apnTitle = iosMessageTitle
  }

  if (iosMessageBody) {
    payload.apnBody = iosMessageBody
  }

  if (fbMessage) {
    payload.fb = fbMessage
  }

  helper.sendNotificationWithPayload(segment, payload, tags).then((notification) => {
    console.log(`${se}/console/submit/custom/${identity} success: `, notification.sid);
    res.redirect(`/${se}/console/${identity}`)
  }).catch((errorMessage) => {
    console.log(`${se}/console/submit/custom/${identity} error: `, errorMessage);
    res.redirect(`/${se}/console/${identity}`)
  })
})

app.post('/:se/console/submit/:identity', (req, res) => {
  const se = req.params.se
  const identity = req.params.identity
  const body = req.body
  const segment = req.body.segment
  const message = req.body.message

  helper.sendNotification(segment, message).then((notification) => {
    console.log(`/${se}/console/submit/${identity}: success:`, notification.sid);
    res.redirect(`/${se}/console/${identity}`)
  }).catch((errorMessage) => {
    console.log(`/${se}/console/submit/${identity}: error: `, errorMessage);
    res.redirect(`/${se}/console/${identity}`)
  })
})

// NOTE Admin console for an SE
app.get('/:se/console/:identity', authRequired,(req, res) => {
  const se = req.params.se
  const identity = req.params.identity

  // only load the users/ data which have the this se tag
  helper.fetchConsoleData(identity, se).then((consoleData) => {
    res.render('console.hbs', {
      logout: true,
      identity: identity,
      salesEngineer: se,
      segments: consoleData.get('segments'),
      users: consoleData.get('users'),
      bindings: consoleData.get('bindings')
    })
  }).catch((errorMessage) => {
    console.log(`/${se}/console/identity ERROR`, errorMessage);
  })
})

//NOTE remove specific binding from Admin Console
app.post('/:se/console/:identity/remove/binding/:sid', (req, res) => {
  const se = req.params.se
  const identity = req.params.identity
  const sid = req.params.sid
  const remove = async () => {
    helper.deleteBinding(sid)
  }
  remove().then(() => {
    res.redirect(`/${se}/console/${identity}`)
  })

})

/*Load custom Console for Identity/ User*/
app.get('/console/:identity', (req, res) => {
  const identity = req.params.identity
  helper.fetchConsoleData(identity).then((consoleData) => {
    res.render('console.hbs', {
      logout: true,
      identity: identity,
      segments: consoleData.get('segments'),
      users: consoleData.get('users'),
      bindings: consoleData.get('bindings')
    })
  }).catch((errorMessage) => {
    console.log("/console/identity ERROR", errorMessage);
  })
})


//NOTE load only the information for this identity associated this SE
app.get('/:se/profile/:identity', authRequired, (req, res) => {
  const se = req.params.se
  const identity = req.params.identity

  let messengerCodeUrl = ""
  const generateCode = async() => {
    const url = await helper.generateParametricMessengerCode(identity, se)
    return url
  }

  generateCode().then((messengerCodeUrl) => {
    helper.retrieveNotifyUser(identity).then((user) => {
      helper.retrieveNotifyBindings(identity, 'all').then((bindings) => {
        var phoneNumber
        if (bindings.length > 0) {
          bindings.forEach((binding) => {
            if (binding.bindingType == 'sms') {
              phoneNumber = binding.address
            }
          })
        }

        res.render('profile.hbs', {
          logout: true,
          salesEngineer: se,
          email: user.identity,
          phoneNumber: phoneNumber,
          bindings: bindings,
          segments: user.segments,
          messengerCodeUrl: messengerCodeUrl
        })
      })
    }).catch((errorMessage) => {
      if (errorMessage.status == 404) {
        const currentDate = new Date()
        //create a segment for new users registered today associated with an SE (used to later send to specific segments)
        const newUserSegment = `new-users-${currentDate.getMonth()+1}-${currentDate.getDate()}-${se}`
        let segments = []
        segments.push(se)
        segments.push(newUserSegment)
        //create User if they don't exist
        helper.createUser(identity, segments).then((user) => {

          res.render('profile.hbs', {
            logout: true,
            salesEngineer: se,
            email: identity,
            phoneNumber: '',
            bindings: '',
            segments: segments,
            messengerCodeUrl: messengerCodeUrl
          })
        })
      }
    })
  }).catch((errorMessage) => {
    console.log("generate code error", errorMessage);
    res.render('home.hbs', {
      alert: true,
      alertMessage: errorMessage
    })
  })
})

/* User update Preferred Channel of Communication*/
app.post('/:se/profile/:identity/bindings/', (req, res) => {
  const se = req.params.se
  const bindingSid = req.body.binding
  const identity = req.params.identity
  const user = {
    identity: identity
  }

  helper.fetchBindings(user).then((bindings) => {
    bindings.forEach((binding) => {
      binding.tags.forEach((tag) => {
        if (tag === 'preferred') {
          helper.createBinding(identity, binding.bindingType, binding.address, [se])
        }
        console.log(tag);
      })
      if (binding.sid === bindingSid)  {
        helper.createBinding(identity, binding.bindingType, binding.address , ['preferred', se])
        res.redirect(`/${se}/profile/${identity}`)
      }
    })
  }).catch((errorMessage) =>{
    console.log(errorMessage);
  })
})

/*Update User Contact Information*/
app.post('/:se/profile/:identity/update', (req, res) => {
  // let params = req.body
  const se = req.params.se
  const identity = req.params.identity
  const phoneNumber = req.body.phoneNumber

  if (phoneNumber != null && phoneNumber != '') {
    //check phone number format
    const parsedPhoneNumber = phoneUtil.parse(phoneNumber, 'US');
    const formattedNumber = phoneUtil.format(parsedPhoneNumber, PNF.E164)

    const createBinding = async() => {
      await helper.createBinding(identity, 'sms', formattedNumber , [se])
    }
    createBinding()
  }

  res.redirect(`/${se}/profile/${identity}`)
})

/* Generic Remove a Channel/ Binding with BindingSid */
app.post('/:se/:identity/removeBinding/:bindingSid', (req, res) => {
  const se = req.params.se
  const identity = req.params.identity
  const bindingSid = req.params.bindingSid

  var responseUrl = `/${se}/profile/${identity}`
  if (identity.match(/\.*@INSERT_YOUR_ADMIN_DOMAIN_HERE$/)) {
    responseUrl = `/${se}/console/${identity}`
  }

  const removeBinding = async() => {
    await helper.deleteBinding(bindingSid)
  }

  removeBinding()
  res.redirect(responseUrl)
})

/* Remove a User from the Admin */
app.post('/:se/:identity/removeUser/:userSid', (req, res) => {
  const se = req.params.se
  const identity = req.params.identity
  const userSid = req.params.userSid
  const removeUser = async() => {
    await helper.deleteUser(userSid)
  }
  removeUser().then(() => {
    res.redirect(`/${se}/console/${identity}`)
  })

})

/* Remove User from Segment */
app.post('/:se/profile/:identity/:segment', (req, res) => {
  const se = req.params.se
  const identity = req.params.identity
  const segment = req.params.segment

  const removeSegment = async () => {
    await helper.removeSegment(identity, segment)
  }
  removeSegment()
  res.redirect(`/${se}/profile/${identity}`)
})


// Inbound Marketing SMS for MARKETING_PHONE_NUMBER
app.post('/sms', (req, res) => {
  const from = req.body.From
  var messageBody = ''

  if (req.body.Body === 'YES') {
    //opt user into service
      messageBody = "Welcome to Notify Hall! You have been opted in to receive marketing communications. Stay tuned!"
      //create binding
      helper.createBinding(from, 'sms', from,'feature-1-group')
      helper.sendMessage(env.MARKETING_PHONE_NUMBER, from, messageBody)

  } else if (req.body.Body === 'NO') {
      messageBody = "You will no longer receive any messages from us. Reply YES to opt back in."

      //fetch binding corresponding to the from number, get the sid, remove binding
      helper.fetchAllBindings().then((bindings) => {
        bindings.forEach((binding) => {
          if (binding.identity == from) {
            helper.deleteBinding(binding.sid)
          }
        })
      }).catch((errorMessage) => {
        console.log("Error trying to fetch bindings");
      })


      helper.sendMessage(env.MARKETING_PHONE_NUMBER, from, messageBody)

      //remove binding
      //TODO

  } else {
      messageBody = "This number is not actively monitored. Please visit our website for more information."
      helper.sendMessage(env.MARKETING_PHONE_NUMBER, from, messageBody)
  }
  res.send(messageBody)
})

/* Handlebars Helpers for rendering HTML with Dynamic Content */
hbs.registerHelper('option', function(items, options) {
  var out = ""
  if (items.length > 0) {
    items.forEach((segment) => {
      out = out + "<option>" + segment + "</option>";
    })
  }
  return out;
})

hbs.registerHelper('consoleManageUsersRow', function(items, options) {
  var out = ""
  items.forEach((user) => {
    out = out + '<tr>' + '<td>' + user.identity + '</td>' + '<td>' + user.segments + '</td>'
  })
  return out;
})

hbs.registerHelper('consoleManageUsersTable', function(items, options){
  var output = ""
  const root = items.data.root.bindings
  const bindings = items.data.root.bindings
  const users = items.data.root.users
  const segments = items.data.root.segments

  const identity = items.data.root.identity
  const se = items.data.root.salesEngineer

  users.forEach((user) => {
    const cardDivision = '<div class="card">'
    const cardHeader = `<h4 class="card-header">User: ${user.identity}</h4>`

    const cardBlock = '<div class="card-block">'
    const cardSubtitle = `<h6 class="card-subtitle mb-2 text-muted">Belongs to: ${user.segments}</h6>`

    const userChannelsTable = '<table class="table table-striped">'
    const userChannelsTableHeader = '<thead><th>Binding SID</th><th>Type</th><th>Address</th><th>Tags</th><th>Remove</th></thead>'
    output += cardDivision + cardHeader + cardBlock + cardSubtitle + userChannelsTable + userChannelsTableHeader + '<tbody>'

    bindings.forEach((binding) => {
      if (user.identity === binding.identity) {
        const userChannelsDeleteButton = `<form action='/${se}/${identity}/removeBinding/${binding.sid}' method='post'><button type="submit" value="" class="btn btn-outline-warning">Remove Channel</button></form>`
        const userChannelsTableBody = '<tr>' + '<td>' + `${binding.sid}` + '</td>'
        +'<td>'+ `${binding.bindingType}` + '</td>'
        +'<td>'+ `${binding.address}` + '</td>'
        +'<td>'+ `${binding.tags}` + '</td>'
        + '<td>' + userChannelsDeleteButton + '</td>' +'</tr>'
        output = output + userChannelsTableBody
      }
    })
    output = output + '</tbody>'
    const userChannelsTableEnd = '</table>'
    output = output + userChannelsTableEnd
    output = output + "<hr>"

    const cardDivisionEnd = '</div></div>'
    let deleteUserButton = `<form action='/${se}/${identity}/removeUser/${user.sid}' method='post'><button type="submit" class="btn btn-outline-danger">Delete User</button></form>`

    if (se == user.identity) {
      //disable the Admin from deleteing their own User object
      deleteUserButton = `<form action='/${se}/${identity}/removeUser/${user.sid}' method='post'><button type="submit" class="btn btn-outline-danger" disabled>Delete User</button></form>`
    }
    output += deleteUserButton + cardDivisionEnd

  })

  const endTable = '</table>'
  output = output + endTable

  return output
})


hbs.registerHelper('profileSegmentRow', function(items, options) {
  var out = ""
  const se = options.data.root.salesEngineer
  const identity = options.data.root.email
  if (items.length > 0) {
    items.forEach((segment) => {
      let unsubscribeButton = `<form action='/${se}/${identity}/${segment}' method='post'><button type="submit" value="${segment}" class="btn btn-danger">Unsubscribe</button></form>`
      if (segment == se) {
        unsubscribeButton = `<form action='/${se}/${identity}/${segment}' method='post'><button type="submit" value="${segment}" class="btn btn-danger" disabled>Unsubscribe</button></form>`
      }
      out = out + '<tr>' + '<td>' + segment + '</td>' + '<td>' + `${unsubscribeButton}` + '</td>' + '</tr>';
    })
  }
  return out;
})

hbs.registerHelper('profileBindingRow', function(items, options) {
  var out = ""
  const se = options.data.root.salesEngineer
  const identity = options.data.root.email
  var out = ""
  if (items.length > 0) {
    items.forEach((binding) => {
      const removeChannelButton = `<form action='/${se}/${identity}/removeBinding/${binding.sid}' method='post'><button type="submit" class="btn btn-danger">Remove</button></form>`
      out = out + '<tr>' + '<td>' + binding.bindingType + '</td>' + '<td>' + binding.address + '</td>' + '<td>' + binding.tags +'</td>' + '<td>' + `${removeChannelButton}` + '</td>' + '</tr>'
    })
  }
  return out
})

hbs.registerHelper('profileOptionBinding', function(items, options) {
  const se = options.data.root.salesEngineer
  const identity = options.data.root.email
  var out = ""
  const form = `<form class="form-inline" action="/${se}/profile/${identity}/bindings/" method="post">`
  const label = '<label class="mr-sm-2" for="inlineFormCustomSelect">Set Preferred Channel of Communication</label>'
  const select = '<select name="binding" class="custom-select mb-2 mr-sm-2 mb-sm-0" id="inlineFormCustomSelect">'
  const firstOption = '<option selected>Choose...</option>'
  out = out + form + label + select + firstOption

  if (items.length > 0) {
    items.forEach((binding) => {
      out = out + `<option value="${binding.sid}">` + binding.bindingType + ` ` + `${binding.address}` + "</option>"
    })
  }
  const selectEnd = '</select>'
  const button = '<button type="submit" class="btn btn-success">Save Preferences</button>'
  const formEnd = '</form>'
  out = out + selectEnd + button + formEnd
  return out
})

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
})
