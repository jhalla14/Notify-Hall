# Notify-Hall
Notify Hall represents a paradigm shift in communications by letting you take back control of your communications! Notify Hall is a user-first approach to communication which allows you to focus on sending notifications while empowering users to choose how they want to consume it. Built upon the extensive capabilities of Twilio’s Notify, Notify Hall is a reference deployment for you to run, extend and/or fork to enhance and embed specific functionality into your applications.

See the formal announcement of Notify Hall on the Twilio Communications Blog [insert future blog post link].

<hr />

## Project Overview
This repository contains two projects: web (Node.js) and iOS (Swift). This project is built leveraging the powerful capabilities of [Twilio Notify](https://www.twilio.com/notify) to orchestrate notifications across a variety of channels. In this project we will leverage SMS, Facebook Messenger, and iOS Push Notifications. Push notifications will require a physical iOS device. You are welcome to download and run the iOS app or follow the iOS configuration instructions to embed push notifications into an existing mobile application.

This project serves serves two roles for sending and receiving notifications. For a detailed overview of both of these perspectives consult the Getting Started section of the Blog Post [insert blog post link]. Otherwise, the general rule of thumb is that Admins are Senders and Users are Recipients.

## Web Configuration
**Web Prerequisites**
* [Twilio Account](https://www.twilio.com/)
* [Twilio Phone Number](https://www.twilio.com/docs/api/notify/guides/sms-quickstart#purchase-a-twilio-phone-number)
* [CoPilot Messaging Service](https://www.twilio.com/docs/api/notify/guides/sms-quickstart#messagingservice)
* [Notify Service](https://www.twilio.com/docs/api/notify/guides/sms-quickstart#notifyservice)

#### Google Sign In Setup
We leverage Google’s Sign In service to authenticate all users. Follow the the [Google Sign In Setup directions](https://developers.google.com/identity/sign-in/web/devconsole-project). When prompted for an Authorized redirect URI use the following:
```http://localhost/auth/google/callback/```

While still logged into your Google Cloud Console, click Library under APIs & Services, and search for the Google + API and enable. This will provide your project with the correct permissions to use the Google Sign In service.

#### Facebook Messenger
We leverage Facebook Webhooks to manage our interactions with the Facebook Messenger service. Follow the [Facebook Messenger quickstart](href="https://www.twilio.com/docs/api/notify/guides/messenger-notifications). Facebook Webhooks require another endpoint in which to send all Messenger events. To eliminate the hassle of standing up a server, I recommend using a managed serverless environment such as [Twilio Functions](https://www.twilio.com/functions). Our Function will be responsible for registering the User who scans our Messenger Code with our Twilio Notify Service.

To setup a Twilio Function, first  [configure your Twilio Runtime](https://www.twilio.com/console/runtime/functions/configure) with two of the environment variables you set up in the prerequisites section. This is shown in the figure below:

![Twilio Function Environment Variables](/GitHub-Assets/twilio_functions_env_var.png)

To create a Function, navigate to your [Twilio Runtime](https://www.twilio.com/console/runtime/overview), click on Functions, select a new empty Function, and paste the following code into the Function. This Function is responsible for first verifying our webhook with Facebook. Note this is only needed for the initial verification from Facebook. After the initial request you may comment that portion out. After verifying this endpoint, this Function will receive all of the Facebook Webhooks which we will add next.

```javascript
const got = require('got')
const request = require('request');

/* Create a Binding with our Notify Service */
function createBinding(identity, address, segment, notifyService) {
 	notifyService.bindings.create({
  		identity: identity,
    	bindingType: "facebook-messenger",
    	address: address,
   		tag: [segment]
	}).then((binding) => {
		console.log("Binding created successfully", binding.sid)
    }).catch((errorMessage) => {
        console.log("Error creating fb binding", errorMessage)
    })
}


/* Trick to embed two pieces of information to automatically group the User into a Segment */
function replaceCharacter(original) {
  const output = original.replace(":", "@")
  return output
}


/* Echo any FB Messages sent to us back to the User */
function sendMessage(event, accessToken, callback) {
	let sender = event.sender.id;
	let text = event.message.text;
	
    request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: accessToken},
    method: 'POST',
    json: {
      recipient: {id: sender},
      message: {text: text}
    }
  }, function (error, response) {
    if (error) {
        console.log('Error sending message: ', error);
    } else if (response.body.error) {
        console.log('Error: ', response.body.error);
    }
       callback(null, {
        			status: 200,
        			data: {
          				message: 'Message Sent'
        			}
          	})
  });
}

exports.handler = function(context, event, callback) {
 	const FB_ACCESS_TOKEN = context.FB_ACCESS_TOKEN
	const client = context.getTwilioClient()
	const notifyService = client.notify.v1.services(context.NOTIFY_SERVICE_SID)
 
  //used initially for Facebook webhook validation to receive Messenger webhook events
   /*
  	if (event.hub_mode === 'subscribe' && event.hub_verify_token === FB_ACCESS_TOKEN) {
      console.log("Validating Webhook")
      callback(null, event.hub_challenge)
    } else {
     	console.error("Failed Validation. Make sure the validation tokens match")
      	callback(null, 403)
    }
    */
    

  const page = event.object
 /* check the FB webhook for when the User either sends in a message or scans a Messenger Code */ 
if (page === 'page') {
	const facebookEntry = event.entry
    facebookEntry.forEach((entry) => {
      entry.messaging.forEach((entryEvent) => {
        if (entryEvent.message) {
          sendMessage(entryEvent, FB_ACCESS_TOKEN, callback);
       
        } else if (entryEvent.postback) {
          console.log("Postback", entryEvent.referral, entryEvent.sender.id);
          
          const parameters = entryEvent.referral.ref.split('+_')
          const identity = replaceCharacter(parameters[0])
          const segment = parameters[1]
          const address = entryEvent.sender.id
          createBinding(identity, address, segment, notifyService)
          callback(null, {
        			status: 200,
        			data: {
          				message: 'Facebook Binding created!'
        			}
          	})
          
        } else if (entryEvent.referral) {
          console.log("Referral", entryEvent.referral, entryEvent.sender.id);
          const parameters = entryEvent.referral.ref.split('+_')
          const identity = replaceCharacter(parameters[0])
          const segment = parameters[1]
          const address = entryEvent.sender.id
          createBinding(identity,address, segment, notifyService)
          callback(null, {
        			status: 200,
        			data: {
          				message: 'Facebook Binding created!'
        			}
          	})
        } else {
          console.log("Webhook received unknown event", entryEvent);
          callback(null, {
            status: 404,
            data: {
              message: "Webhook received unknown event"
            }
          })
        }
      });
    })
  }
};
```

To enable the use of Messenger Codes for our Facebook App you will need to enable the following Facebook webhooks:

![Facebook Webhooks](/GitHub-Assets/facebook_webhooks.png)

You can find out more information about these webhooks on the [Facebook Developer portal](https://developers.facebook.com/docs/messenger-platform/webhook/#setup). Additionally, feel free to spice things up by adding a profile photo to your Facebook App. This will change the center image of your Messenger Code.

Once you’ve authorized your webhook endpoint with Facebook, be sure to complete [configuring your Notify service with Facebook](https://www.twilio.com/docs/api/notify/guides/messenger-notifications#create-a-facebook-messenger-configuration). 

*Note: if you are using Messenger Codes, you will not have to create a webpage to authorize facebook users. We will be using Messenger Codes to get user consent.*

#### Dependency Installation
Install Node modules with the following:

```
// Twilio capailities
npm install twilio@3.3.0-alpha-1 --save

// Express Web Server, HBS Template Rendering & Passport Cookie Management
npm install express --save
npm install hbs --save
npm install body-parser --save // used parse HTTP Requests
npm install cookie-parser --save
npm install express-session --save
npm install passport --save
npm install passport-google-oauth20 --save
npm install got --save

// Google Libraries for Google Sign In
npm install google-auth-library --save
npm install google-libphonenumber --save
```

#### Configure Environment Variables
Update ```config.js``` with your environment variables. If you are missing any of the following variables below, refer to the prerequisites section.

```
module.exports = {
  "TWILIO_ACCOUNT_SID": "YOUR_TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN": "YOUR_TWILIO_AUTH_TOKEN",
  "TWILIO_NOTIFY_SERVICE_SID": "YOUR_NOTIFY_SERVICE_SID",
  "MARKETING_PHONE_NUMBER": "INSERT_A_TWILIO_NUMBER_FROM_YOUR_ACCOUNT",
  "SECRET": "INSERT_YOUR_PASSPORT_JS_SECRET",
  "CLIENT_ID": "INSERT_YOUR_GOOGLE_CLIENT_ID",
  "CLIENT_SECRET": "INSERT_YOUR_GOOGLE_CLIENT_SECRET",
  "CALLBACK_URL": "http://localhost:3000/auth/google/callback/",
  "FB_ACCESS_TOKEN": "INSERT_YOUR_FB_ACCESS_TOKEN",
}
```

#### Change Google Client ID
Change the Google Sign in Button to be associated with your Google Sign in project by replacing your client ID in ```navigation.hbs``` as shown below.

```html
<meta name="google-signin-client_id" content="INSERT_YOUR_GOOGLE_CLIENT_ID">
```

### Admin Setup
In order to access the Admin Console, we need to differentiate between an Admin and an User. In this project, we will choose to differentiate based on the domain name for the Google hosted email. Therefore, in ```app.js``` we will set Admins to match the domain of @exmaple.com as shown in Figure 1. If you’re using a single or generic domain as an Admin, you may also match based on the email address itself rather than on the domain.

```javascript
/* Extract Profile Information from Google Sign In */
function extractProfile (profile) {
  
  ...

  profile.emails.forEach((email) => {
    emailAddress = email.value
    // set to match custom domain
    if (email.value.match(/\.*@example.com$/)) {
      admin = true
    }
  })

  ...
}
```

To complete Admin setup we also need to make a similar change in app.js.
```javascript
/* Generic Remove a Channel/ Binding with BindingSid */
app.post('/:se/:identity/removeBinding/:bindingSid', (req, res) => {
 ...
  if (identity.match(/\.*@example.com$/)) {
    responseUrl = `/${se}/console/${identity}`
  }
...
})
```
Once the Admin is configured. All other emails/ domains will automatically default to the User role.

### Run the project
Navigate to your project’s directory and run node app.js. Then point your browser to ```localhost:3000/:se/``` and click Login and proceed to login with your Admin email. Once the Google authentication process is complete you will see the Console as shown below.

*Note: Your console may appear empty if this is your first time logging in. Users will populate once we complete User Setup in the next section.*





