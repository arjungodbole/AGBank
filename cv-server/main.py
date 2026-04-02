from fastapi import FastAPI
from pydantic import BaseModel
import base64
import numpy as np
import cv2
from fastapi.middleware.cors import CORSMiddleware 

app = FastAPI()

app.add_middleware(
      CORSMiddleware,                                                                                                            
      allow_origins=["*"],                                  
      allow_methods=["*"],
      allow_headers=["*"],
  )

class Denomination(BaseModel):
    color:str
    value:float

class ScanRequest(BaseModel):
    image: str
    denominations: list[Denomination]

COLOR_RANGES = {                                                                                                               
      "red":    [(0, 70, 50), (10, 255, 255)],                                                            
      "red2":   [(170, 70, 50), (179, 255, 255)],                                                
      "blue":   [(100, 70, 50), (130, 255, 255)],                                                                                
      "green":  [(35, 70, 50), (85, 255, 255)],                                                                                  
      "white":  [(0, 0, 180), (179, 30, 255)],                                                                                   
      "black":  [(0, 0, 0), (179, 255, 50)],                                                                                     
      "yellow": [(20, 70, 50), (35, 255, 255)],
      "grey": [(0, 0, 50), (179, 30, 180)],
      "light blue": [(85, 40, 100), (100, 255, 255)],                                                                                  
  } 
 
@app.post("/scan")
def my_handler(request: ScanRequest):
    image = request.image
    image_data = image.split(",")[1] if "," in image else image  
    image_bytes = base64.b64decode(image_data)
    np_array = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    blurred = cv2.GaussianBlur(img, (9, 9), 2)
    hsv = cv2.cvtColor(blurred, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(blurred, cv2.COLOR_BGR2GRAY)
    circles = cv2.HoughCircles(                                                                                                    
      gray,                                                                                                                      
      cv2.HOUGH_GRADIENT,                                                                                                        
      dp=1.2,                                                                                                                    
      minDist=50,                                           
      param1=100,
      param2=30,                                                                                                                 
      minRadius=20,
      maxRadius=150                                                                                                              
  )
    if circles is None:                                                                                                            
      return {"counts": {}, "total": 0}

    circles = np.uint16(np.around(circles))                   
                                                                                                                                 
    counts = {}
                                                                                                                                 
    for circle in circles[0, :]:                                                                                                   
      x, y, r = circle[0], circle[1], circle[2]
      sample_r = r // 3
      y1 = max(0, y - sample_r)                             
      y2 = min(hsv.shape[0], y + sample_r)                                                                                       
      x1 = max(0, x - sample_r)                                                                                                  
      x2 = min(hsv.shape[1], x + sample_r)

      region = hsv[y1:y2, x1:x2]
      avg_h = np.mean(region[:, :, 0])                                                                                           
      avg_s = np.mean(region[:, :, 1])                      
      avg_v = np.mean(region[:, :, 2])

      matched_color = None                                  
      for color_name, (lower, upper) in COLOR_RANGES.items():                                                                    
          if lower[0] <= avg_h <= upper[0] and \
             lower[1] <= avg_s <= upper[1] and \
             lower[2] <= avg_v <= upper[2]:
              matched_color = "red" if color_name == "red2" else color_name
              break                                                                                                              
                                                                                                                                 
      if matched_color:                                                                                                          
          counts[matched_color] = counts.get(matched_color, 0) + 1   

    total = 0                                                                                                                      
    for color, count in counts.items():                                                                                            
      denom = next((d for d in request.denominations if d.color.lower() == color.lower()), None)                                 
      if denom:                                                                                                                  
          total += denom.value * count     

    return {"counts": counts,
            "total" : total
            }