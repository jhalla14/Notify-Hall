# Notify-Hall
Notify Hall represents a paradigm shift in communications by letting you take back control of your communications! Notify Hall is a user-first approach to communication which allows you to focus on sending notifications while empowering users to choose how they want to consume it. Built upon the extensive capabilities of Twilio’s Notify, Notify Hall is a reference deployment for you to run, extend and/or fork to enhance and embed specific functionality into your applications.

See the formal announcement of Notify Hall on the Twilio Communications Blog [insert future blog post link].

<hr />

<h1>Project Overview</h1>
<p>This repository contains two projects: web (Node.js) and iOS (Swift). This project is built leveraging the powerful capabilities of <a href="https://www.twilio.com/notify">Twilio Notify</a> to orchestrate notifications across a variety of channels. In this project we will leverage SMS, Facebook Messenger, and iOS Push Notifications. Push notifications will require a physical iOS device. You are welcome to download and run the iOS app or follow the iOS configuration instructions to embed push notifications into an existing mobile application.</p>

<p>This project serves serves two roles for sending and receiving notifications. For a detailed overview of both of these perspectives consult the Getting Started section of the Blog Post [insert blog post link]. Otherwise, the general rule of thumb is that Admins are Senders and Users are Recipients.</p>

<h2>Web Configuration</h2>
<em>Web Prerequisites</em>
<ul>
  <li><a href="https://www.twilio.com/">Twilio Account</a></li>
  <li><a href="https://www.twilio.com/docs/api/notify/guides/sms-quickstart#purchase-a-twilio-phone-number">Twilio Phone Number</a></li>
  <li><a href="https://www.twilio.com/docs/api/notify/guides/sms-quickstart#messagingservice">CoPilot Messaging Service</a></li>
  <li><a href="https://www.twilio.com/docs/api/notify/guides/sms-quickstart#notifyservice">Notify Service</a></li>
</ul>

<h4>Google Sign In Setup</h4>
<p>We leverage Google’s Sign In service to authenticate all users. Follow the the <a href="https://developers.google.com/identity/sign-in/web/devconsole-project">Google Sign In Setup directions</a>. When prompted for an Authorized redirect URI use the following:</p>
<code>http://localhost/auth/google/callback/</code>

<p>While still logged into your Google Cloud Console, click Library under APIs & Services, and search for the Google + API and enable. This will provide your project with the correct permissions to use the Google Sign In service.
</p>

<h4>Facebook Messenger</h4>
<p>We leverage Facebook Webhooks to manage our interactions with the Facebook Messenger service. Follow the <a href="https://www.twilio.com/docs/api/notify/guides/messenger-notifications">Facebook Messenger quickstart</a>. Facebook Webhooks require another endpoint in which to send all Messenger events. To eliminate the hassle of standing up a server, I recommend using a managed serverless environment such as <a href="https://www.twilio.com/functions">Twilio Functions</a>. Our Function will be responsible for registering the User who scans our Messenger Code with our Twilio Notify Service.</p>

<p>To setup a Twilio Function, first  <a href="https://www.twilio.com/console/runtime/functions/configure">configure your Twilio Runtime</a> with two of the environment variables you set up in the prerequisites section. This is shown in the figure below:</p>

![Twilio Function Environment Variables](/GitHub-Assets/twilio_functions_env_var.png)

<p>To create a Function, navigate to your <a href="https://www.twilio.com/console/runtime/overview">Twilio Runtime</a>, click on Functions, select a new empty Function, and paste the following code into the Function. This Function is responsible for first verifying our webhook with Facebook. Note this is only needed for the initial verification from Facebook. After the initial request you may comment that portion out. After verifying this endpoint, this Function will receive all of the Facebook Webhooks which we will add next.
</p>

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

<p>To enable the use of Messenger Codes for our Facebook App you will need to enable the following Facebook webhooks:</p>

![Facebook Webhooks](/GitHub-Assets/facebook_webhooks.png)

You can find out more information about these webhooks on the [Facebook Developer portal](https://developers.facebook.com/docs/messenger-platform/webhook/#setup). Additionally, feel free to spice things up by adding a profile photo to your Facebook App. This will change the center image of your Messenger Code.
