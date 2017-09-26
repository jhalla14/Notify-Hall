//
//  Constants.swift
//  notifyHall
//
//  Created by Joshua Hall on 6/27/17.
//  Copyright © 2017 Joshua Hall. All rights reserved.
//

import UIKit

class Constants: NSObject {

    static let TWILIO_ACCOUNT_SID = Bundle.main.infoDictionary!["TWILIO_ACCOUNT_SID"] as! String
    static let TWILIO_AUTH_TOKEN = Bundle.main.infoDictionary!["TWILIO_AUTH_TOKEN"] as! String
    static let TWILIO_NOTIFY_HALL_SERVICE_SID = Bundle.main.infoDictionary!["TWILIO_NOTIFY_SERVICE_SID"] as! String
    static let TWILIO_RUNTIME_NOTIFY_REGISTRATION_ENDPOINT = Bundle.main.infoDictionary!["TWILIO_RUNTIME_NOTIFY_REGISTRATION_ENDPOINT"] as! String
    static let TWILIO_NOTIFY_BASE_URL = "https://notify.twilio.com/v1/Services/".appending(TWILIO_NOTIFY_HALL_SERVICE_SID)
}
