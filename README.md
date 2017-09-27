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

![Admin Console](/GitHub-Assets/admin_console.png)
```URL: localhost:3000/:se/console/:identity```

Admin setup is now complete, but we don’t have anyone to send a notification to. Let’s get a User setup to receive these notifications.

### User Setup
Users may sign in with their Google hosted email address at ```localhost:3000/:se/``` and enter the same login process as we did for setting up the Admin. This time we will choose an email address (also Google hosted) with a domain that is not @example.com. If you have a browser with the Admin Console still open, I recommend logging into the User role using an entirely different browser.

Once logged in, Users will be greeted with a screen shown in Figure 4. Users are able to update their contact information with additional phone numbers, set their preferred channel, and unsubscribe from lists. See the next section for learning how to add more channels.

![User Profile](/GitHub-Assets/user_profile.png)
```URL: localhost:3000/:se/profile/:identity```

By default, all Users are subscribed to a Segment associated to the path they logged in with and into a Segment based on the day they first logged in. For example, if I signed up on August 24th, 2017 with the path ```localhost:3000/jhall/login``` (```/:se = jhall```) I would be in two segments: _jhall_ and _new-users-08-24-17-jhall_.

#### Enter Phone Number and click update
In the phone number section, enter a phone number to receive SMS messages and click Update. Reload the page.

We now have a phone number in place and could begin sending SMS messages from the Admin to this User. But that’s not why we’re reading this blog post! At the heart of Notify Hall is the ability for the user to consume notifications on whatever channel(s) they prefer. To enable these capabilities we will first need to opt in the user for FB Messenger and push notifications.

#### Enable FB Messenger Channel

Enabling Facebook Messenger couldn’t be any simpler. While logged in as the User, open the Messenger App on your mobile device and scan the Messenger Code! 

![Messenger Code](/GitHub-Assets/messenger_code_screenshot.PNG)

Once you have properly configured the Facebook channel, refresh your User Profile page and you should see another channel appear in the Set Your Preferences section:

![Adding Facebook Messenger Channel](/GitHub-Assets/adding_facebook_messenger_channel.png)

Ready to send a notification? See the Send a Notification section. Otherwise, let’s also get our iOS app up and running.

## iOS 
The Notify Hall companion app allows users to register and receive Push Notifications. The companion app is purely for allowing and receiving push notifications. Note: The app doesn’t currently handle push notifications when running in the foreground. 

### iOS Prerequisites
* Apple Developer Account (Note: you will need a paid membership to send and receive push notifications)
* Physical iOS device with 10.3 or later
* APNS Certificates
* Google Sign In 
	* Go to Firebase Console, add your existing Google Cloud project to Firebase.
	* Download the generated .plist file and add to your project.
	* Be sure to add a URL Scheme to your project by following these [directions](https://developers.google.com/identity/sign-in/ios/start-integrating).

#### Notify Device Registration
We need an endpoint to register this device with the Notify Service. Again, we will leverage Twilio Functions. In [Twilio Runtime](https://www.twilio.com/console/runtime/overview), create a new Function, and paste the following:

```javascript
xports.handler = function(context, event, callback) {
	let client = context.getTwilioClient()
    let notifyService = client.notify.v1.services(context.NOTIFY_SERVICE_SID)
    
    const identity = event.identity
    const bindingType = event.bindingType
    const address = event.address
  
  	console.log("Identity", identity)
  	console.log("Binding Type", bindingType)
  	console.log("Address", address)
  
  	var endpoint
    if (event.endpoint != undefined) {
      endpoint = event.endpoint
      console.log("Endpoint", endpoint)
      
      notifyService.bindings.create({
      endpoint: endpoint,
      identity: identity,
      bindingType: bindingType,
      address: address
    }).then((binding) => {
      callback(null, {
        status: 200,
        data: {
          message: 'Binding with endpoint created!'
        }
      })
    }).catch((errorMessage) => {
      console.log("Error creating binding with endpoint", errorMessage)
      callback(null, {
        status: 500,
        data: {
          error: errorMessage,
          message: 'Failed to create binding. ' + errorMessage
        }
      })
    })
	
    } else {
      notifyService.bindings.create({
      identity: identity,
      bindingType: bindingType,
      address: address
    }).then((binding) => {
      callback(null, {
        status: 200,
        data: {
          message: 'Binding created!'
        }
      })
    }).catch((errorMessage) => {
      console.log("Error creating binding", errorMessage)
      callback(null, {
        status: 500,
        data: {
          error: errorMessage,
          message: 'Failed to create binding. ' + errorMessage
        }
      })
    })
	
    }  
};
```

Make note of the URL path. You will need this later.

#### Dependency Installation
Setup CocoaPod dependencies from the project directory in a Terminal window:
```pod install```
Be sure to only open the ```.xcworkspace``` file.

#### Configure Environment Variables
All environment variables are stored in Info.plist and accessed via the Constants.swift file.

In order to setup your environment variables select your project Target and navigate to Build Settings. Click the + button to create a new User-Defined Settings.

![Xcode Create User Defined Settings](/GitHub-Assets/xcode_add_user_defined_setting.png)

Create a User-Defined Setting for each of the following:
* Twilio Account SID
* Twilio Auth Token
* Twilio Notify Service SID
* Twilio Runtime Notify Registration Endpoint (the URL you copied from earlier)

Once complete your User-Defined Settings should resemble the screenshot below.
![Xcode Completed User-Defined Settings](/GitHub-Assets/xcode_user_defined_settings_complete.png)

_Optional: you may configure debug and release variables for separating development and production environments. If you go this route you will also need to create an additional registration endpoint and another Notify Service. An example screenshot is below._
![Xcode Seperating Debug & Release Environments](/GitHub-Assets/xcode_option_debug_release.png)

#### Info.plist configuration
Once you have your User-Defined Settings in place, you will need to access them via you Info.plist file. For the same User-Defined Settings you just created complete the following:
![Xcode info.plist file](/GitHub-Assets/xcode_info_plist.png)

#### Enable Push Notification Capabilities
Enable Push Notification Entitlements in your Target > Capabilities > Push Notifications
![Xcode Enabling Push Notifications](/GitHub-Assets/ios_enable_push_notifications.png)

#### Run iOS App
Connect and run the iOS app on a physical device. Once the app has launched, login with the same email address used for the User. Once logged in, allow notifications and tap Allow to register your iOS device with the Notify Service you have already configured.
![Allow Push Notifications](/GitHub-Assets/ios_allow_notifications.PNG)

User setup is now complete. Now let’s start sending some notifications!

## Features
Focusing on the experience of the user, Notify Hall is able to provide a unique set of capabilities to orchestrate messages over many channels. These features include:

* Sending a Notification (Admin)
* Changing Preferences (User)
* Send a Custom Notification (Admin)

### Send a Notification
Admins are able to quickly send a notification on their Console by selecting a group of Users and crafting a custom message. Pressing Send will proceed to alert all of the available channels for all Users in that group.
![Send a Notification](/GitHub-Assets/admin_send_notification.png)

After sending you should receive a notification to all of your registered channels. Below shows an push notification.
![Push Notification Example](/GitHub-Assets/notification_ios.jpg)

### Changing Preferences
Depending on the number of channels a User has registered with the service, they can set a preferred channel from the dropdown as shown in Figure 11. Notify Hall provides Users with complete control over their experience by allowing them to remove any existing channels and unsubscribe from they lists they have opted into.
![Set your channel preference](/GitHub-Assets/set_preference.png)

### Sending Custom Notification
Notify also offers extensive capabilities to send specific content to multiple channels in a single API call. Therefore, Admins have options to alert all the devices of a user or just their preferred device while simultaneously customizing the content for that specific device. Admins are free to choose this option without having to worry about the specific end-user devices.
![Enhanced Notifications](/GitHub-Assets/admin_custom_notification.png)

Example of custom notifications being received.
![SMS, iOS, and FB Messenger Notification](/GitHub-Assets/notification_all.jpg)

## Supporting Documentation
* [APNS Documentation](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/APNSOverview.html#//apple_ref/doc/uid/TP40008194-CH8-SW1)
* [Messenger Code API](https://developers.facebook.com/docs/messenger-platform/discovery/messenger-codes/)
* [FB/ Messenger Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)

## Supplemental
* [Twilio Functions Quickstart](https://www.twilio.com/docs/api/runtime/functions)


# _We can’t wait to see what you build!_







