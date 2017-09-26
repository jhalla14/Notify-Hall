//
//  NetworkRequest.swift
//  notifyHall
//
//  Created by Joshua Hall on 6/27/17.
//  Copyright © 2017 Joshua Hall. All rights reserved.
//

import UIKit
import Alamofire
import SwiftyJSON

class NetworkRequest: NSObject {

    private static let sharedNetworkRequestInstance = NetworkRequest()
    
    private override init() {
        super.init()
    }
    
    class func sharedInstance() -> NetworkRequest {
        return self.sharedNetworkRequestInstance
    }
    
    class func getHeaders() -> HTTPHeaders {
        var headers: HTTPHeaders = [
            "Authorization": "",
            "Accept": "application/json"
        ]
        
        if let authorizationHeader = Request.authorizationHeader(user: Constants.TWILIO_ACCOUNT_SID, password: Constants.TWILIO_AUTH_TOKEN) {
            headers[authorizationHeader.key] = authorizationHeader.value
        }
        return headers
    }
    
    /* Generic Network Request function using AlamoFire and SwiftyJSON */
    func request(url: String?, method: HTTPMethod, headers: HTTPHeaders, completion: @escaping (JSON) -> Void) {
        Alamofire.request(url!, method: method, parameters: [:], headers: headers).responseJSON { (response) in
            switch(response.result) {
            case .success(_):
                if response.result.value != nil {
                    let jsonObj = JSON(response.result.value!)
                    completion(jsonObj)
                }
                
                break
                
            case .failure(_):
                
                let jsonObj = ["hasError": true , "errorMessage" : response.result.error!.localizedDescription] as [String : Any]
                print("Network Request: request error", jsonObj)
                completion(JSON(jsonObj))
                
                break
            }
        }
    }
    
    func requestWithParams(url: String?, method: HTTPMethod, headers: HTTPHeaders, parameters: Parameters, completion: @escaping (JSON) -> Void) {
        
        Alamofire.request(url!, method: method, parameters: parameters, headers: headers).responseJSON { (response) in
            switch(response.result) {
            case .success(_):
                if response.result.value != nil {
                    let jsonObj = JSON(response.result.value!)
                    completion(jsonObj)
                }
                
                break
                
            case .failure(_):
                
                let jsonObj = ["hasError": true , "errorMessage" : response.result.error!.localizedDescription] as [String : Any]
                print("Network Request: request error", jsonObj)
                completion(JSON(jsonObj))
                
                break
            }
        }
    }
}
