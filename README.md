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

![GitHub Logo](/GitHub-Assets/twilio_functions_env_var.png)
