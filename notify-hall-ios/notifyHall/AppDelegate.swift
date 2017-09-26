//
//  AppDelegate.swift
//  notifyHall
//
//  Created by Joshua Hall on 6/27/17.
//  Copyright © 2017 Joshua Hall. All rights reserved.
//

import UIKit
import Alamofire
import UserNotifications
import SwiftyJSON
import GoogleSignIn
import Google
import SafariServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, GIDSignInDelegate {

    var window: UIWindow?
    var devToken: String?
    var user: User?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        
        // Initialize GoogleSignIn
        var configureError: NSError?
       GGLContext.sharedInstance().configureWithError(&configureError)
        assert(configureError == nil, "Error configuring Google services: \(String(describing: configureError))")
        
        GIDSignIn.sharedInstance().delegate = self

        return true
    }
    
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplicationOpenURLOptionsKey : Any] = [:]) -> Bool {
        let sourceApplication = options[UIApplicationOpenURLOptionsKey.sourceApplication]
        let annotation = options[UIApplicationOpenURLOptionsKey.annotation]
        
        return GIDSignIn.sharedInstance().handle(url as URL!,sourceApplication: sourceApplication as! String, annotation: annotation)
    }
    
    func sign(_ signIn: GIDSignIn!, didSignInFor user: GIDGoogleUser!, withError error: Error!) {
        if (error == nil) {
            // Perform any operations on signed in user here.
            let userId = user.userID                  // For client-side use only!
            let idToken = user.authentication.idToken // Safe to send to the server
            let fullName = user.profile.name
            let givenName = user.profile.givenName
            let familyName = user.profile.familyName
            let email = user.profile.email            
            
            print("UserSignIn:", userId!, idToken!, fullName!, givenName!, familyName!, email!)

        } else {
            print("\(error.localizedDescription)")
        }
    }
    
    func sign(_ signIn: GIDSignIn!, didDisconnectWith user: GIDGoogleUser!, withError error: Error!) {
        // Perform any operations when the user disconnects from app here.
        // ...
    }

    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("Device did register for push notifications")
        
        let tokenChars = (deviceToken as NSData).bytes.bindMemory(to: CChar.self, capacity: deviceToken.count)
        var tokenString = ""
        for i in 0..<deviceToken.count {
            tokenString += String(format: "%02.2hhx", arguments: [tokenChars[i]])
        }
        print("Received token data! \(tokenString)")
        devToken = tokenString
        let email = GIDSignIn.sharedInstance().currentUser.profile.email
        self.registerDevice(identity: email!)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Couldn't register remote notifications: ", error)
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("Notification received.")
        if let aps = userInfo[AnyHashable("aps")] as? [AnyHashable: Any] {
            let message = aps[AnyHashable("alert")] as? String
            let alertController = UIAlertController(title: "Notification", message: message, preferredStyle: .alert)
            let defaultAction = UIAlertAction(title: "OK", style: .default, handler: nil)
            alertController.addAction(defaultAction)
            self.window?.rootViewController?.present(alertController, animated: true, completion: nil)
        }
    }
    
    
    /* Register Device Token with your backend */
    func registerDevice(identity: String) {
        
        let headers = NetworkRequest.getHeaders()
        
        let delegate = UIApplication.shared.delegate as! AppDelegate
        let email = GIDSignIn.sharedInstance().currentUser.profile.email
        
        var params: Parameters = [
            "identity": email!,
            "bindingType": "apn",
            "address": delegate.devToken!
        ]
        
        if let noitfyEndpoint = try? KeychainAccess.readEndpoint(identity: identity) {
            params["endpoint"] = noitfyEndpoint
        } else {
            print("Error retrieving endpoint from keychain")
        }
        
        NetworkRequest.sharedInstance().requestWithParams(url: Constants.TWILIO_RUNTIME_NOTIFY_REGISTRATION_ENDPOINT, method: .post, headers: headers, parameters: params) { (response:JSON) in
            
            if (response["status"] != JSON.null) {
                print("Register Device:", response)
            } else {
                print("Register Device: response ", response)
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }


}

