var app = angular.module("BaseApp", []);
app.controller("MainController", function($scope, $timeout, $interval, $compile) {

    var app = this;


    app.init = function(){

        app.current_selection_span = null;
        app.has_current_selection = false;
        app.saved_params = {}

        app.editor_mode = window.js_init.mode  // either "config" (file) or "directive" (single-line command)
        $scope.editor_content = window.js_init.editor_content  // when loading existing content on page load
        app.query_args = Object.fromEntries(new URLSearchParams(location.search))

        app.handle_selection_once = _.debounce(app.handle_selection, 300, {trailing: true})
        $(document).on('mouseup', function(){
            app.handle_selection_once()
        });

        window.onmessage = function(e){
            try {
                var event_data = JSON.parse(e.data)
            } catch {
                return // not a json event
            }

            if (event_data.type == "save_clicked"){
                app.save_params()
            }
            if (event_data.type == "file_opened"){
                $scope.editor_content = event_data.editor_content
                $scope.path = event_data.cwd || event_data.content_id
                app.load_existing_model_params()
                $scope.$applyAsync()
            }
        };
        app.msg_parent('editor_loaded', '*')
    }

    app.load_existing_model_params = function(){

        // clear any existing model params
        _.each(app.saved_params, function(param){
            app.current_selection_span = param["_span"]
            app.current_selection_span_id = param["_id"]
            app.remove_current_selection_span()
        });

        $.ajax({
            url: "model-params/",
            data: {
                model: app.query_args.model,
                path: $scope.path,
                mode: app.editor_mode,
            },
            success: function(data){
                let params_to_add = []
                _.each(data, function(mp){

                    // create a span for existing model param
                    var selection_span = app.create_selection_span(mp._id)

                    selection_span.attr("ng-click", "app.edit_param($event)")
                    $compile(selection_span)($scope)  // activate ng-click attr

                    var editor_line = document.querySelectorAll('.editor-line')[ mp._location.line ]
                    var range = document.createRange();
                    range.selectNode(editor_line.childNodes[0])
                    range.setStart(editor_line.childNodes[0], mp._location.col_start)
                    range.setEnd(editor_line.childNodes[0], mp._location.col_end)

                    // add to saved params
                    app.saved_params[mp._id] = mp
                    app.saved_params[mp._id]["_span"] = selection_span

                    // store the range & span so we can layer them in once we've found/created all of the ranges & spans.
                    // inserting them as we go creates issues as we try to add subsequent params to the same line since
                    // the location.col_start/location.col_end don't match up once an earlier param is added to that line
                    params_to_add.push({
                        mp: mp,
                        range: range,
                        selection_span: selection_span,
                    })

                })

                // pass through the params and add the spans to each line, then update their inner text
                _.each(params_to_add, function(param_to_add){
                    let mp = param_to_add.mp
                    let range = param_to_add.range
                    let selection_span = param_to_add.selection_span

                    range.surroundContents(selection_span[0])

                    if (mp.is_editable){
                        selection_span.attr("class", "saved-param")
                        selection_span.text(mp.name)
                    } else {
                        selection_span.attr("class", "saved-param-static")
                        selection_span.text(mp.default)
                    }
                })

            }
        })

    }

    app.handle_selection = function(){
        app.handle_selection_once.cancel()

        var range = window.getSelection().getRangeAt(0)
        var editor_line = $(range.startContainer).parent()
        if (! editor_line.hasClass("editor-line")){
            // console.log('user selected somewhere outside of <pre id="file_contents"></pre>')
            return
        }

        var selected_text = window.getSelection() + ""  // cast directly to string
        if (!selected_text){
            return
        }

        if (app.current_selection_span && app.form_mode == 'create'){
            // sometimes <span>s get left behind if user selects again without clearing prev selection
            app.remove_current_selection_span()
        }

        if (!$(range.startContainer).is($(range.endContainer))){
            alert("please only select one line of text at a time")
            app.close_form()
            return
        }

        let line_offset = 0
        var line_contents = editor_line.contents()
        if (line_contents.length > 1){  // more than a single text node on this editor_line
            console.log("there are params in this editor line, looking for offset")

            var selection_text_node = $(window.getSelection().anchorNode)
            var has_reached_selection_text_node = false
            _.each(line_contents, function(child){
                if (has_reached_selection_text_node){
                    return  // basically a continue statement
                }
                child = $(child)

                if (child.is(selection_text_node)){
                    console.log("found it:", child)
                    has_reached_selection_text_node = true
                } else {
                    var tag = child.prop("tagName")
                    if (tag == undefined){  // text nodes
                        line_offset += child.text().length
                    } else if (tag == "SPAN") {  // existing params
                        var param = app.saved_params[child.attr("id")]
                        line_offset += param._orig_selection.length
                    }

                }
            })
        }

        app.selection_location = {
            col_start: range.startOffset + line_offset,
            col_end: range.endOffset + line_offset,
        }

        // get the line number of their selection
        $(".editor-line").each(function(line_num, line_element){
            var line = $(line_element)
            if (line.is( editor_line )){
                app.selection_location["line"] = line_num
            }
        })

        $scope.param = {}
        $scope.param.type = "str"
        $scope.param.default = selected_text
        $scope.param.is_editable = true

        if (app.editor_mode == "directive"){
            // try to populate the 'name' attribute by looking for earlier flag
            app.guess_param_name()
        }

        app.guess_param_data_type(selected_text)
        app.open_form(range, 'create')  // bring up the param form

        // surround the user's current selection with a span
        var span_id = app.generate_unique_id(selected_text)
        var selection_span = app.create_selection_span(span_id)
        range.surroundContents(selection_span[0]);

        app.current_selection_span = selection_span
        app.current_selection_span_id = span_id
        $scope.$applyAsync()
    }

    app.save_param = function(){

        var current_param = $scope.param
        current_param["name"] = app.slugify($scope.param.display_name)

        var existing_param = app.saved_params[app.current_selection_span_id]

        if (existing_param){
            _.each(current_param, function(v, k){
                existing_param[k] = v
            })
        } else {
            current_param["_span"] = app.current_selection_span
            current_param["_id"] =   app.current_selection_span_id
            current_param["_location"] = app.selection_location
            current_param["_orig_selection"] = app.current_selection_span.text()

            app.saved_params[app.current_selection_span.attr("id")] = current_param
        }

        if (current_param.restrict_choices){
            current_param["choices"] = _.remove(current_param.choices, function(choice){
                return typeof choice == "string" && choice.length > 0 // remove null or "" choices
            })
        } else {
            current_param["choices"] = []  // clear any existing choices if they uncheck restrict_choices
        }


        // update the current_selection_span to be a saved-param
        if (current_param.is_editable){
            app.current_selection_span.text($scope.param.name)
            app.current_selection_span.attr("class", "saved-param")
        } else {
            app.current_selection_span.text($scope.param.default)
            app.current_selection_span.attr("class", "saved-param-static")
        }

        app.current_selection_span.attr("ng-click", "app.edit_param($event)")
        $compile(app.current_selection_span)($scope)  // activate ng-click attr

        app.current_selection_span = null
        app.current_selection_span_id = null

        app.close_form()
    }

    app.remove_current_selection_span = function($event){
        app.squash_event($event)

        var selected_text = app.current_selection_span.text()
        if (app.saved_params[app.current_selection_span_id]){
            // reload original selection text for saved params
            selected_text = app.saved_params[app.current_selection_span_id]["_orig_selection"]
        }

        app.current_selection_span.after(_.escape(selected_text))
        app.current_selection_span.remove()

        $("#file_contents").get(0).normalize()  // collapse text nodes

        delete app.saved_params[app.current_selection_span_id]
        app.current_selection_span = null
        app.current_selection_span_id = null

        app.close_form()
    }

    app.create_selection_span = function(span_id){

        var selection_span = $("<span>");
        selection_span.attr("id", span_id);
        selection_span.attr("ng-class", "{'current-selection': '"+span_id+"'==app.current_selection_span_id}");
        $compile(selection_span)($scope)  // activate ng-class

        return selection_span
    }

    app.edit_param = function($event){
        var click_target = $($event.target)
        var saved_param = app.saved_params[click_target.attr("id")]

        if (saved_param["_location"]){
            app.selection_location = saved_param["_location"]
        }

        // setup the span
        app.current_selection_span = saved_param["_span"]
        app.current_selection_span_id = saved_param["_id"]
        $scope.param = saved_param

        app.open_form($event.target, 'edit')
    }

    app.manage_choices = function($event){
        app.squash_event($event)
        if (!$scope.param.choices){
            $scope.param.choices = [null]
        }
        if ($scope.param.choices[$scope.param.choices.length-1] != null){
            $scope.param.choices.push(null)
        }
        if ($scope.param.choices.length == 0){
            $scope.param.choices.push(null)
        }
    }
    app.remove_choice = function($event, $index){
        app.squash_event($event)
        $scope.param.choices.splice($index, 1)
    }

    app.guess_param_name = function(){
        var earlier_line_pieces = $(".editor-line")
            .eq(app.selection_location.line) // get the right line
            .text().substr(0, app.selection_location.col_start)
            .trim().split(" ")

        var prev_piece = earlier_line_pieces[ earlier_line_pieces.length-1 ].trim()

        // remove leading dashes
        if (prev_piece.indexOf("--") == 0){
            prev_piece = prev_piece.substr(2)
        } else if (prev_piece.indexOf("-") == 0){
            prev_piece = prev_piece.substr(1)
        }

        // remove trailing equal sign
        if (prev_piece.endsWith("=")){
            prev_piece = prev_piece.substr(0, prev_piece.length-1)
        }

        if (prev_piece.match(/^[a-zA-Z]+$/)){
            // if we end up with something that's only letters...
            $scope.param.display_name = prev_piece
        } else {
            console.log("not going to guess param name with", prev_piece)
        }
    }

    app.guess_param_data_type = function(selected_text){
        if (selected_text.match(/[a-zA-Z]+/)){
            $scope.param.type = "str"
        } else if (parseFloat(selected_text, 10) != NaN && selected_text.indexOf(".") !== -1){
            $scope.param.type = "float"
        } else if (parseInt(selected_text) != NaN){
            $scope.param.type = "int"
        } else if (selected_text.match(/[0-9 \-]+/)){
            $scope.param.type = "datetime"
        }
    }

    app.open_form = function(selection, mode){
        app.form_mode = mode; // create or edit
        app.manage_choices()

        var selection_rect = selection.getBoundingClientRect()

        let form_padding = 25
        $("#form-container").css({
            "top": selection_rect.bottom - form_padding + "px",
            "left": selection_rect.right + form_padding + "px",
        })
        app.has_current_selection = true;
        $scope.$applyAsync()

        $("#name.form-control").focus()
    }

    app.close_form = function($event){
        app.squash_event($event)

        $scope.param = {}  // reset form values
        app.has_current_selection = false;

        if (app.current_selection_span && !app.saved_params[app.current_selection_span_id]){
            // remove the span around the selection if it exists and hasn't been saved
            app.remove_current_selection_span()
        }

        app.current_selection_span = null
        app.current_selection_span_id = null
        $scope.$applyAsync()

        return false;
    }

    app.save_params = function($event){
        app.squash_event($event)

        var params = _.map(_.values(app.saved_params), function(param){
            p = _.clone(param)
            delete p["_span"]  // remove references to page elements
            p.choices = JSON.stringify(p.choices)
            return p
        });

        $.post({
            url: document.location.href,
            data: JSON.stringify({
                params: params,
                path: $scope.path,
                editor_html: $("#file_contents").html(),
                editor_content: $scope.editor_content,
            }),
            contentType: "application/json",
            success: function(resp, status, xhr){
                console.log(resp)
                app.msg_parent('params_saved', '*')
            },
            error: function(xhr, status, resp){
                console.log(resp, status, xhr)
                if (resp == ""){
                    alert("Error connecting to backend.")
                } else {
                    alert("Error saving your parameters. Please try again.")
                }
                app.msg_parent('params_not_saved', '*')
            }
        })

        return false
    }

    // short utility functions

    app.generate_unique_id = function(salt){
        return salt.replace(/[^A-Za-z0-9_-]/g, '') + "-" + Math.round((new Date().valueOf() * Math.random()) % 1000000)
    }

    app.squash_event = function($event){
        if ($event){
            $event.preventDefault();
        }
        return false;
    }

    app.slugify = function(name){
        return name.toLowerCase().replace(/[^a-z0-9\_ ]/g, "").trim().replace(/ /g, "_")
    }

    app.is_iframe = function() {
        try {  // https://stackoverflow.com/a/326076/625840
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    app.msg_parent = function(msg){
        if (typeof msg == 'string'){
            msg = {'type': msg}
        }
        j = JSON.stringify(msg)
        window.top.postMessage(j, '*')
    }

    app.init();

})
