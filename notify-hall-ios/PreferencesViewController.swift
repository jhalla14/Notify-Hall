//
//  PreferencesViewController.swift
//  notifyHall
//
//  Created by Joshua Hall on 6/27/17.
//  Copyright © 2017 Joshua Hall. All rights reserved.
//

import UIKit
import SwiftyJSON
import UserNotifications
import Alamofire
import GoogleSignIn


class PreferencesViewController: UIViewController {

    @IBOutlet weak var pushNotificationsSwitch: UISwitch!
    @IBOutlet weak var preferredChannelPicker: UIPickerView!
    @IBOutlet weak var emailLabel: UILabel!
    @IBOutlet weak var updatePreferencesButton: UIButton!
    @IBOutlet weak var dismissButton: UIButton!
    @IBOutlet weak var userImageView: UIImageView!
    @IBOutlet var refreshTapGestureRecognizer: UITapGestureRecognizer!
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    var user: User? {
        didSet {
            let delegate = UIApplication.shared.delegate as! AppDelegate
            delegate.user = self.user
        }
    }
    
    var bindingCount = 0
    var bindings = [Binding]()
    var notificationCenter: UNUserNotificationCenter?
    var selectedpreferredChannelPickerRow: Int = 0
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        NotificationCenter.default.addObserver(self, selector: #selector(PreferencesViewController.refreshProfileData), name: NSNotification.Name(rawValue: "UPDATE_PROFILE_DATA"), object: nil)
    }
    

    override func viewDidLoad() {
        super.viewDidLoad()
        self.preferredChannelPicker.dataSource = self
        self.preferredChannelPicker.delegate = self

        self.notificationCenter = UNUserNotificationCenter.current()
        self.updatePreferencesButton.isHidden = true

        self.pushNotificationsSwitch.setOn(UIApplication.shared.isRegisteredForRemoteNotifications, animated: true)
        
        if let currentUser = GIDSignIn.sharedInstance().currentUser {
            emailLabel.text = currentUser.profile.email
            
            let profileImageURL = currentUser.profile.imageURL(withDimension: 200)
            let profileImageData = try? Data(contentsOf: profileImageURL!)
            let image = UIImage(data: profileImageData!)
            userImageView.image = image
            userImageView.layer.cornerRadius = userImageView.frame.width/2
            userImageView.clipsToBounds = true
            
            loadBindings(completion: {(count: Int) in
                self.preferredChannelPicker.reloadAllComponents()
                
            })
        }
       
    }
    
    @IBAction func dismissButtonPressed(_ sender: UIButton) {
        self.dismiss(animated: true) {
            GIDSignIn.sharedInstance().signOut()
        }
    }

    /* Hidden 3 Tap Gesture to Refresh the Display;)*/
    @IBAction func handleTap(_ sender: UITapGestureRecognizer) {
        refresh()
        refreshProfileData()
    }

    
    @IBAction func pushNotificationsSwitched(_ sender: UISwitch) {
        if sender.isOn {
            print(sender.isOn)
            self.notificationCenter?.requestAuthorization(options: [.alert, .sound], completionHandler: { (granted: Bool, error:Error?) in
                if granted {
                    DispatchQueue.main.async {
                        UIApplication.shared.registerForRemoteNotifications()
                        self.pushNotificationsSwitch.setOn(true, animated: true)
                    }
                }
            })

        } else {
            // request authorization for push notifications
            UIApplication.shared.unregisterForRemoteNotifications()
            
            let alert = UIAlertController(title: "Notifications disabled.", message: "All push notifications have been disabled.", preferredStyle: .alert)
            let alertAction = UIAlertAction(title: "Done", style: .default, handler: nil)
            alert.addAction(alertAction)
            present(alert, animated: true, completion: nil)
            
        }
    }
    
    
    /* Load Bindings for logged in User directly from Twilio Notify REST API */
    func loadBindings(completion: @escaping (Int) -> Void) {
        let email = GIDSignIn.sharedInstance().currentUser.profile.email
        
        let urlString = Constants.TWILIO_NOTIFY_BASE_URL.appending("/Users/\((email)!)/Bindings")
        let headers = NetworkRequest.getHeaders()
        
        NetworkRequest.sharedInstance().request(url: urlString, method: .get, headers: headers) { (response: JSON) in
            if (response["status"] != JSON.null){
                print(response["errorMessage"])
                
                
            } else {
                self.bindings.removeAll()
                let dictionaryResponse = response.dictionaryValue
                let bindings = dictionaryResponse["bindings"]?.array
                
                for binding in bindings! {
                    let newBinding = Binding()
                    newBinding.sid = binding["sid"].stringValue
                    newBinding.accountSid = binding["account_sid"].stringValue
                    newBinding.serviceSid = binding["service_sid"].stringValue
                    newBinding.dateCreated = binding["date_created"].stringValue
                    newBinding.dateUpdated = binding["date_updated"].stringValue
                    newBinding.notificationProtocolVersion = binding["notification_protocol_version"].stringValue
                    newBinding.endpoint = binding["endpoint"].stringValue
                    newBinding.identity = binding["identity"].stringValue
                    newBinding.bindingType = binding["binding_type"].stringValue
                    newBinding.address = binding["address"].stringValue
                    newBinding.tags = binding["tags"].arrayObject as? [String]
                    newBinding.credentialSid = binding["credential_sid"].stringValue
                    newBinding.url = binding["url"].stringValue
                    
                    self.bindings.append(newBinding)
                }
                
                self.bindingCount = (bindings?.count)!
                completion((bindings?.count)!)
                
            }
        }
    }
    
    /* Refresh the binding data and reload the UI */
    func refresh() {
        self.loadBindings { (count: Int) in
            self.preferredChannelPicker.reloadAllComponents()
            print("Refresh Complete")
        }
    }
    
    /* Refresh Profile Data and bindings */
    func refreshProfileData() {
        if let currentUser = GIDSignIn.sharedInstance().currentUser {
            emailLabel.text = currentUser.profile.email
            
            let profileImageURL = currentUser.profile.imageURL(withDimension: 200)
            let profileImageData = try? Data(contentsOf: profileImageURL!)
            let image = UIImage(data: profileImageData!)
            userImageView.image = image
            userImageView.layer.cornerRadius = userImageView.frame.width/2
            userImageView.clipsToBounds = true
            
            loadBindings(completion: {(count: Int) in
                self.preferredChannelPicker.reloadAllComponents()
            })
        }
    }

}

extension PreferencesViewController: UIPickerViewDataSource {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        if self.bindingCount == 0 {
            return 0
        }
        return self.bindingCount
    }
}

extension PreferencesViewController: UIPickerViewDelegate {
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        self.selectedpreferredChannelPickerRow = row
    }
    
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return self.bindings[row].bindingType
    }
    
    /* Custom formatting for Binding data */
    func pickerView(_ pickerView: UIPickerView, attributedTitleForRow row: Int, forComponent component: Int) -> NSAttributedString? {
        let rowTitle = self.bindings[row].bindingType?.appending(" ").appending(((self.bindings[row].tags?.joined(separator: " "))?.appending(" ").appending(self.bindings[row].address!))!)
        let attributedString = NSAttributedString(string: rowTitle!, attributes: [NSForegroundColorAttributeName : UIColor.white])
        
        return attributedString
    }
    
}
