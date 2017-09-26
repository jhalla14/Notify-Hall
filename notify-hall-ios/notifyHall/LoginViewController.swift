//
//  LoginViewController.swift
//  notifyHall
//
//  Created by Joshua Hall on 6/27/17.
//  Copyright © 2017 Joshua Hall. All rights reserved.
//

import UIKit
import SwiftyJSON
import Alamofire
import GoogleSignIn

class LoginViewController: UIViewController, GIDSignInUIDelegate {

    var user: User?
    @IBOutlet weak var signInButton: GIDSignInButton!
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    override var prefersStatusBarHidden: Bool {
        return true
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.signInButton.style = .wide
        self.signInButton.colorScheme = .light
        GIDSignIn.sharedInstance().uiDelegate = self
        GIDSignIn.sharedInstance().signOut()
    }
    
    // Dismiss the "Sign in with Google" view
    func sign(_ signIn: GIDSignIn!,
              dismiss viewController: UIViewController!) {
        self.dismiss(animated: true, completion: {
            self.performSegue(withIdentifier: "preferencesSegue", sender: self)
        })
    }

}
