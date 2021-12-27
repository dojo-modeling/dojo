def geotiff_form():
    return """<div id='Geotiff_form'>
	<div class="form-group">				
	    <label for='geotiff_Feature_Name'>Feature_name:</label>
	    <input class="form-control"
	    type="text"
	    name="geotiff_Feature_Name" id='Feature_name'
	  />
	 </div>
  <br/>
  <div class="form-group">				
    <label for='geotiff_Band'>Band:</label>
      <input class="form-control"
      type="text"
      name="geotiff_Band" id='geotiff_Band' value = 1
    />
    </div>
  <br/>
  <div class="form-group">				
    <label for='geotiff_Null_Val'>Null data value:</label>
      <input class="form-control"
      type="text"
      name="geotiff_Null_Val" id='geotiff_Null_Val' value = -9999
    /> 
   </div>
  <br/> 
  <div class="form-group">
    <label for='geotiff_Date'>Date (optional):</label>
      <input class="form-control"
      type="text"
      name="geotiff_Date" id='geotiff_Date'
    />
   </div>
  </div>"""


def excel_form():
    return """<div class="form-group">				
				    <label for='excel_Sheet'>Sheet</label>
            <div id="sheets">
				    </div>
				 </div>"""
