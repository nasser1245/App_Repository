$(function(){

    var OuterMethoList;
    var ParamsList;
	var store = store || {};
    store.init = function() {
        this.iat = null;
        this.nbf = null;
        this.exp = null;
        this.currentTimeContainer = $("#currentTime");
        this.iatContainer = $("#iat");
        this.nbfContainer = $("#nbf");
        this.expContainer = $("#exp");
        this.tokenContainer = $("#token");
        this.decodedTokenContainer = $("#decodedToken");
    }

    /**
     * Export the current JWT values to the specified containers.
     */
    store.exportValues = function(){
        this.tokenContainer.html(this.jwt || '&nbsp;');
        var parsedJSON = JSON.parse(this.claim);

        var iatString = '';
        var nbfString = '';
        var expString = '';

        if (parsedJSON) {
            this.iat = new Date(parsedJSON.iat * 1000);
            this.nbf = new Date(parsedJSON.nbf * 1000);
            this.exp = new Date(parsedJSON.exp * 1000);

            iatString = this.dateObjToString(this.iat);
            nbfString = this.dateObjToString(this.nbf);
            expString = this.dateObjToString(this.exp);
        }
        var beautifiedJSON = JSON.stringify(parsedJSON, null, 4);
        this.decodedTokenContainer.html( ((this.claim)) ? beautifiedJSON : '&nbsp;');

        store.iatContainer.html(iatString);
        store.nbfContainer.html(nbfString);
        store.expContainer.html(expString);
    }

    /**
     * Decodes the JWT
     * @param jwt
     * @returns {*}
     */
    store.decodeToken = function(jwt){
        var a = jwt.split(".");
        return  b64utos(a[1]);
    }

    /**
     * Sets the JWT to the store object
     * @param data
     */
    store.setJwt = function(data){
        this.jwt = data;
        this.claim = this.decodeToken(data);
    }
    
    /**
     *
     * @param date
     * @returns {string}
     */
    store.dateObjToString = function(date) {
        return date.toDateString() + ' ' + date.toLocaleTimeString();
    }

    setInterval(function() {
        var currentTime = new Date();
        store.currentTimeContainer.html(store.dateObjToString(currentTime));
    }, 100);

	$("#frmLogin").submit(function(e){
        e.preventDefault();
        var a = $("#frmLogin").serialize();
        $.ajax({
            type: "POST",
            Method: "POST",
            url: 'request.php',
            data: a
          }).done(function(data){
        	store.setJwt(data.jwt);
            store.exportValues();
            OuterMethodList = data.OuterMethodList;
            ParamsList = data.ParamsList;
            var $MethodList = $("#MethodList");
            $MethodList.empty();
            $.each(OuterMethodList, function(index,value) {
            	$MethodList.append(
                $("<option />")
                .val(index)
                .text(value.MethodName)
              )
            });
            $MethodList.change();
        });
        });
	$( "#MethodList" ).change(function(){
		var $ParamDiv = $("#ParameterDiv");
		$ParamDiv.empty();
		var a = $(this).find('option:selected').text();
		$.each(ParamsList, function(index,value) {
			if(value.MethodName == a){
				$('<input name="'+ value.ParamName +'" type="text" class="form-control" id="'+
						value.ParamName +'" placeholder="'+ value.ParamName +
						 ',  type = '+ value.Type +'">')
				.appendTo($ParamDiv);
			}
		})
	});
	
    $('#collapse-btn').on('click', function() {
        $('#json').JSONView('collapse');
      });

      $('#expand-btn').on('click', function() {
        $('#json').JSONView('expand');
      });

      $('#toggle-btn').on('click', function() {
        $('#json').JSONView('toggle');
      });
      
	$("#frmResource").submit(function(e){
        e.preventDefault();
        var a = "Authorization" + '=' + store.jwt + '&' + "MethodName" + '='+ $( "#MethodList option:selected" ).text() 
        + '&' + $("#frmResource").serialize();
        $.ajax({
            type: "POST",
            Method: "POST",
            url: 'request.php',
            data: a,
            success: function(data) {
            		  $("#json").JSONView(data);
            		  $('#json').JSONView('collapse');
            },
            error: function() {
                alert('error2');
            }
        });
    });

    $("#btnExpire").click(function(e){
        e.preventDefault();
        store.jwt = null;
        store.claim = null;
        store.iat = null;
        store.nbf = null;
        store.exp = null;
        store.exportValues();
        $("#resourceContainer").html('');
    });
    store.init();
});