export class SmartFilterEditor {
    
    static _htmlEncode(html) {
        html = $.trim(html);
        return html.replace(/[&"'\<\>]/g, function (c) {
            switch (c) {
                case "&":
                    return "&amp;";
                case "'":
                    return "&#39;";
                case '"':
                    return "&quot;";
                case "<":
                    return "&lt;";
                default:
                    return "&gt;";
            }
        });
    }

    static initialize(maindiv, viewer, startnode) {
        SmartFilterEditor.ctrlPressed = false;

        SmartFilterEditor._chainSkip = 0;
        $(document).on('keyup keydown', function(e){
            
            SmartFilterEditor.ctrlPressed = e.ctrlKey;
        } );

        SmartFilterEditor._maindiv = maindiv;
        SmartFilterEditor._viewer = viewer;
        SmartFilterEditor._mainFilter = new SF.SmartFilter(viewer, startnode);
        SmartFilterEditor._mainFilter.tempId = 0;
        
    }

    static setChainSkip(skip) {
        SmartFilterEditor._chainSkip = skip;

    }
    
    static async display() {
        await SF.SmartFilter.initialize(SmartFilterEditor._viewer);
        let html = "";
        html += '<div class = "modelTreeSearchMain" id="' + SmartFilterEditor._maindiv + '_main">';
        html += '<label style="position:relative;left:5px;">Limit:</label><input onclick=\'SFUI.SmartFilterEditor._limitSelection()\' style="position:relative;left:2px;top:2px;" type = "checkbox" id="' + SmartFilterEditor._maindiv + '_searchfromselection">';
        html += '<button class="modelTreeSearchButton" type="button" style="right:65px;top:2px;position:absolute;" onclick=\'SFUI.SmartFilterEditor.selectAll(this)\'>Select All</button>';
        html += '<button class="modelTreeSearchButton" type="button" style="right:5px;top:2px;position:absolute;" onclick=\'SFUI.SmartFilterEditor.search()\'>Search</button>';
        html += '<hr>';
        html += '<div id="' + SmartFilterEditor._maindiv + '_conditions">';
        html += await SmartFilterEditor._generateConditions();
        html += '</div><hr>';
        html += '<div id="' + SmartFilterEditor._maindiv + '_searchitems" class="modelTreeSearchItems"></div>';
        html += '<div style="position:absolute; right:3px;bottom:20px; font-size:12px;background-color:white" id="' + SmartFilterEditor._maindiv + '_found">Found:</div>';
        html += '</div>';
        $("#" + SmartFilterEditor._maindiv).empty();
        $("#" + SmartFilterEditor._maindiv).append(html);
        SmartFilterEditor._generateSearchResults();
        SmartFilterEditor._addFilterFromUI(false,0);

    }

    static getFilter() {
        return SmartFilterEditor._mainFilter;
    }

    static adjust() 
    {
        let newheight = $("#" + SmartFilterEditor._maindiv + "_main").height() - $("#" + SmartFilterEditor._maindiv + "_conditions").height() - 40;
        $("#" + SmartFilterEditor._maindiv + "_searchitems").css({ "height": newheight + "px" });
    }

    static flush() {
        $("#" + SmartFilterEditor._maindiv).empty();
    }


    static async search() {

        SmartFilterEditor.updateFilterFromUI();
      
        let nodeids = await SmartFilterEditor._mainFilter.apply();

        let startnode = SmartFilterEditor._mainFilter.getStartNode();
        SmartFilterEditor._founditems = [];
        for (let i=0;i<nodeids.length;i++) {
            let chaintext = SmartFilterEditor._mainFilter.createChainText(nodeids[i], startnode, SmartFilterEditor._chainSkip);
            let item = {name: SmartFilterEditor._viewer.model.getNodeName(nodeids[i]), id: nodeids[i], chaintext: chaintext};            
            SmartFilterEditor._founditems.push(item);
        }    
        SmartFilterEditor._generateSearchResults();
    }


    static getSmartFilterFromTempId(id) {

        if (id == 0) {
            return SmartFilterEditor._mainFilter;
        }

        for (let i=0;i<SmartFilterEditor._mainFilter.getNumConditions();i++)
        {
            let filter = SmartFilterEditor._mainFilter.getCondition(i);
            if (filter.childFilter && filter.childFilter.tempId == id)
            {
                return filter.childFilter;
            }
        }

    }

    static isolateAll() {        
                            
        let selections = [];
        for (let i = 0; i < SmartFilterEditor._founditems.length; i++) {
            selections.push(parseInt(SmartFilterEditor._founditems[i].id));
        }
        SmartFilterEditor._viewer.view.isolateNodes(selections);
    }

    static selectAll() {        
                     
        if (!SmartFilterEditor.ctrlPressed)
            SmartFilterEditor._viewer.selectionManager.clear();

        let selections = [];
        for (let i = 0; i < SmartFilterEditor._founditems.length; i++) {
            selections.push(new Communicator.Selection.SelectionItem(parseInt(SmartFilterEditor._founditems[i].id)));
        }
        SmartFilterEditor._viewer.selectionManager.add(selections);
        SmartFilterEditor._generateSearchResults();
    }

    static updateFilterFromUI(smartFilterIn) {
        let smartFilter;
        if (!smartFilterIn)
        {
            smartFilter = SmartFilterEditor._mainFilter;                 
        }
        else
        {
            smartFilter = smartFilterIn;
        }

        for (let i = 0; i < smartFilter.getNumConditions(); i++) {
            let filter = smartFilter.getCondition(i);
            if (filter.childFilter) {
                this.updateFilterFromUI(filter.childFilter);
            }
            else {
                filter.conditionType = SF.SmartFilter.convertStringConditionToEnum($("#" + SmartFilterEditor._maindiv + "_propertyChoiceSelect" + i + "-" + smartFilter.tempId)[0].value);
                if ($("#" + SmartFilterEditor._maindiv + "_modeltreesearchtext" + i + "-" + smartFilter.tempId)[0] != undefined) {
                    filter.text = SmartFilterEditor._htmlEncode($("#" + SmartFilterEditor._maindiv + "_modeltreesearchtext" + i + "-" + smartFilter.tempId)[0].value);
                }
                filter.propertyName = $("#" + SmartFilterEditor._maindiv + "_propertyTypeSelect" + i + "-" + smartFilter.tempId)[0].value;

                filter.propertyType = SF.SmartFilter.convertStringPropertyTypeToEnum(filter.propertyName);

                if (i == 1) {
                    filter.and = ($("#" + SmartFilterEditor._maindiv + "_andOrchoiceSelect" + i + "-" + smartFilter.tempId)[0].value == "and") ? true : false;
                }
                else if (i > 1) {
                    filter.and = ($("#" + SmartFilterEditor._maindiv + "_andOrchoiceSelect" + 1 + "-" + smartFilter.tempId)[0].value == "and") ? true : false;
                }
            }

        }
    }

    static async refreshUI() {     
        $("#" + SmartFilterEditor._maindiv + "_conditions").empty();
        $("#" + SmartFilterEditor._maindiv + "_conditions").append(await SmartFilterEditor._generateConditions());
        SmartFilterEditor.adjust();

    }
    
    static async _andorchangedFromUI() {
        SmartFilterEditor.updateFilterFromUI();
        await SmartFilterEditor.refreshUI();
    }


    static async _addFilterFromUI(createChildFilter, id) {
        let smartFilter;
        SmartFilterEditor._clearSearchResults();
        SmartFilterEditor.updateFilterFromUI();

        smartFilter = SmartFilterEditor.getSmartFilterFromTempId(id);
        let childFilter = null;
        if (createChildFilter) {
            childFilter = new SF.SmartFilter(SmartFilterEditor._viewer, SmartFilterEditor._mainFilter.getStartNode());
            childFilter.addCondition(new SF.SmartFilterCondition());
        }
            
        if (smartFilter.getNumConditions() <= 1) {
            let condition = new SF.SmartFilterCondition();
            condition.setChildFilter(childFilter);

            smartFilter.addCondition(condition);
        }
        else
        {
            let previousCondition = smartFilter.getCondition(smartFilter.getNumConditions() - 1);
            let condition = new SF.SmartFilterCondition();
            condition.setChildFilter(childFilter);
            condition.setAndOr(previousCondition.getAndOr());
            smartFilter.addCondition(condition);
        }

        await SmartFilterEditor.refreshUI();
    }


    static _select(id) {
        if (!SmartFilterEditor.ctrlPressed)
            SmartFilterEditor._viewer.selectionManager.selectNode(parseInt(id), Communicator.SelectionMode.Set);
        else
            SmartFilterEditor._viewer.selectionManager.selectNode(parseInt(id), Communicator.SelectionMode.Toggle);
       
        SmartFilterEditor._generateSearchResults();
    }

    static _deleteFilter(i,id) {
        SmartFilterEditor._clearSearchResults();
        SmartFilterEditor.updateFilterFromUI();
        let smartFilter = SmartFilterEditor.getSmartFilterFromTempId(id);
        smartFilter.removeCondition(i);

        SmartFilterEditor.refreshUI();

    }

    static _limitSelection() {
      
        if ($("#" + SmartFilterEditor._maindiv + "_searchfromselection")[0].checked) {
            let limitselectionlist = [];
            let r = SmartFilterEditor._viewer.selectionManager.getResults();
            for (let i = 0; i < r.length; i++) {
                limitselectionlist.push(r[i].getNodeId());
            }
            SmartFilterEditor._mainFilter.limitToNodes(limitselectionlist);
        }
        else
        {
            SmartFilterEditor._mainFilter.limitToNodes([]);
        }
    }

    static _clearSearchResults() {
        SmartFilterEditor._founditems = undefined; 
        SmartFilterEditor._generateSearchResults();
    }

    static _generateSearchResults() {
        $("#" + SmartFilterEditor._maindiv + "_searchitems").empty();
        $("#" +  SmartFilterEditor._maindiv + "_found").empty();
        if (SmartFilterEditor._founditems == undefined)
            return;

        $("#" +  SmartFilterEditor._maindiv + "_found").append("Found:" + SmartFilterEditor._founditems.length);
      
        let html = "";
        let y = 0;
        let toggle = true;    

        for (let i = 0; i < SmartFilterEditor._founditems.length; i++) {
            toggle = !toggle;
            if (SmartFilterEditor._viewer.selectionManager.isSelected(Communicator.Selection.SelectionItem.create(SmartFilterEditor._founditems[i].id)))
                html += '<div onclick=\'SFUI.SmartFilterEditor._select("' + SmartFilterEditor._founditems[i].id + '")\' class="modelTreeSearchItemSelected">';
            else {
                if (toggle)
                    html += '<div onclick=\'SFUI.SmartFilterEditor._select("' + SmartFilterEditor._founditems[i].id + '")\' class="modelTreeSearchItem1">';
                else
                    html += '<div onclick=\'SFUI.SmartFilterEditor._select("' + SmartFilterEditor._founditems[i].id + '")\' class="modelTreeSearchItem2">';
            }
            html += '<div class="modelTreeSearchItemText">' + SmartFilterEditor._htmlEncode(SmartFilterEditor._founditems[i].name) + '</div>';
            html += '<div class="modelTreeSearchItemChainText">' + SmartFilterEditor._htmlEncode(SmartFilterEditor._founditems[i].chaintext) + '</div>';
            html += '</div>';
            y++;
        }
        $("#" + SmartFilterEditor._maindiv + "_searchitems").append(html);

        SmartFilterEditor.adjust();
    }


    static _generateAndOrChoiceSelect(filter, filterpos, smartFilter) {
        let html = "";
        if (filterpos == 0 || filterpos > 1) {
            if (filterpos ==0) {        
                return '<span style="top:7px;left:6px;position:relative;font-size:14px; margin-top:2px;width:50px;width:50px;max-width:50px;min-width:50px">Where:</span>';
            }
            else {
                return '<span style="top:7px;left:6px;position:relative;font-size:14px; margin-top:2px;width:50px;max-width:50px;min-width:50px">' + (filter.and ? "and":"or") + '</span>';
            }
        }
        else {

            let html = '<span style="top:7px;left:6px;position:relative;font-size:14px; margin-top:2px;width:50px;max-width:50px;min-width:50px">';
            html += '<select onchange=\'SFUI.SmartFilterEditor._andorchangedFromUI()\' id="' +  
            SmartFilterEditor._maindiv + '_andOrchoiceSelect' + filterpos + "-" + smartFilter.tempId + '" value="">\n';

            if (filter.and) {
                html += '<option value="and" selected>and</option>\n';
                html += '<option value="or">or</option>\n';
            }
            else {
                html += '<option value="and">and</option>\n';
                html += '<option value="or" selected>or</option>\n';
            }
                         
            html += '</select></span>\n';
            return html;
        }
    }

    static _generateChoiceSelect(filter, filterpos,smartFilter) {

        let html = '<select onchange=\'SFUI.SmartFilterEditor._andorchangedFromUI()\' style="width:60px;margin-right:3px;" id="' +  
            SmartFilterEditor._maindiv + '_propertyChoiceSelect' + filterpos + "-" + smartFilter.tempId + '" value="">\n';

        let choices = ["has", "exists","!exists", ">=", "<=", "=", "\u2260"];

        for (let i = 0; i < choices.length; i++) {
            if (choices[i] == SF.SmartFilter.convertEnumConditionToString(filter.conditionType)) {
                html += '<option selected value="' + choices[i] + '">' + choices[i] + '</option>\n';
            }
            else {
                html += '<option value="' + choices[i] + '">' + choices[i] + '</option>\n';
            }
        }
       
        html += '</select>\n';
        return html;
    }

    static _clearInputField(filterpos, filterid)
    {
        if ($("#" + SmartFilterEditor._maindiv + "_modeltreesearchtext" + filterpos + "-" + filterid)[0])
        {
            $("#" + SmartFilterEditor._maindiv + "_modeltreesearchtext" + filterpos + "-" + filterid)[0].value = "";
        }
    }

    static _generatePropertyTypeSelect(filter, filterpos, smartFilter) {
      

        let html = '<select onchange=\'SFUI.SmartFilterEditor._clearInputField(' + filterpos + "," + smartFilter.tempId + ');SFUI.SmartFilterEditor._andorchangedFromUI();\' style="font-size:11px; flex: 1 1 auto;max-width:150px;margin-right:3px;min-width:50px" id="' +  
            SmartFilterEditor._maindiv + '_propertyTypeSelect' + filterpos + "-" + smartFilter.tempId + '" value="">\n';       

        let sortedStrings = SmartFilterEditor._mainFilter.getAllProperties();
            
        sortedStrings.unshift("Rel:SpaceBoundary");
        sortedStrings.unshift("Rel:ContainedIn");
        sortedStrings.unshift("Node Color");
        sortedStrings.unshift("Node Type");
        sortedStrings.unshift("Node Chain");
        sortedStrings.unshift("Nodeid");
        sortedStrings.unshift("Node Name");

        let prefix = "";

        for (let i = 0; i < sortedStrings.length;i++) {
            if (filter.propertyName == sortedStrings[i])
                html += '<option value="' + sortedStrings[i] + '" selected>' + prefix + sortedStrings[i] + '</option>\n';
            else
                html += '<option value="' + sortedStrings[i] + '">' + prefix + sortedStrings[i] + '</option>\n';
        }
        html += '</select>\n';
        return html;
    }

    static async _generateInput(filter,filterpos,smartFilter) {
      

        let html = '<input list="datalist' + filterpos + "-" + smartFilter.tempId +'" +  style="flex:1 1 auto; font-size:11px;min-width:100px" id="' + SmartFilterEditor._maindiv + '_modeltreesearchtext' + filterpos + "-" + smartFilter.tempId + '" value="' + filter.text + '">\n';
        html += '<datalist id="datalist' + filterpos + "-" + smartFilter.tempId +'">\n';
        let sortedStrings = [];
        if (filter.propertyName == "Node Type") {
            for (const property in Communicator.NodeType) {
                if (isNaN(parseFloat(Communicator.NodeType[property])))
                    sortedStrings.push(Communicator.NodeType[property]);
            }

        }
        else if (filter.propertyName == "Node Color") {
            if (SmartFilterEditor._viewer.selectionManager.getLast()) {
                let nodeid = SmartFilterEditor._viewer.selectionManager.getLast().getNodeId();
                let children = SmartFilterEditor._viewer.model.getNodeChildren(nodeid);
                if (children.length > 0)
                    nodeid = children[0];
                let colors = await SmartFilterEditor._viewer.model.getNodesEffectiveFaceColor([nodeid]);
                sortedStrings.push(colors[0].r + " " + colors[0].g + " " + colors[0].b);
            }
        }        
        else {
            let options = SmartFilterEditor._mainFilter.getAllOptionsForProperty(filter.propertyName);
            for (let i in options) {
                sortedStrings.push(i);
            }
        }
        sortedStrings.sort();

        for (let i = 0; i < sortedStrings.length; i++) {
            if (filter.propertyName == sortedStrings[i])
                html += '<option value="' + sortedStrings[i] + '" selected>' + sortedStrings[i] + '</option>\n';
            else
                html += '<option value="' + sortedStrings[i] + '">' + sortedStrings[i] + '</option>\n';
        }
        html += '</datalist>\n';
        return html;
    }

    static async _generateConditions(smartFilterIn,index) {                
        let html = "";
        let smartFilter;
        let tempId;
        if (!smartFilterIn)
        {
            SmartFilterEditor.tempId = 0;
            smartFilter = SmartFilterEditor._mainFilter;                 
        }
        else
        {
            smartFilter = smartFilterIn;
        }

        smartFilter.tempId = SmartFilterEditor.tempId;

        if (smartFilterIn)
        {
            if (index == 1)
            {
                html += '<div style = "position:relative;left:65px;top:-10px;background:#e6e8ea;border-radius:5px;">';
            }
            else
            {
                html += '<div style = "position:relative;left:50px;background:#e6e8ea;border-radius:5px;">';

            }
        }
        for (let i = 0; i < smartFilter.getNumConditions(); i++) {
            let filter = smartFilter.getCondition(i);
            if (filter.childFilter) {
                SmartFilterEditor.tempId++;
                html += '<div>';
                html += '<div style="position:relative;width:10px; height:10px;float:left;top:10px;left:-1px" onclick=\'SFUI.SmartFilterEditor._deleteFilter(' + i + "," + smartFilter.tempId + ')\'>';
                html += '<div class="cross"></div></div>';
                html += SmartFilterEditor._generateAndOrChoiceSelect(filter, i, smartFilter);
                html+= await this._generateConditions(filter.childFilter,i);
                html += '</div>';
            }
            else {
                html += '<div style="height:30px">';
                html += '<div style="position:relative;width:10px; height:10px;float:left;top:10px;left:-1px" onclick=\'SFUI.SmartFilterEditor._deleteFilter(' + i + "," + smartFilter.tempId + ')\'>';
                html += '<div class="cross"></div></div>';
                html += SmartFilterEditor._generateAndOrChoiceSelect(filter, i, smartFilter);
                if (i==1)
                {
                    html += '<div style="display:flex;position:relative;top:-11px;left:64px;margin-right: 1em;">';
                }
                else
                {
                    html += '<div style="display:flex;position:relative;top:-10px;left:64px;margin-right: 1em;">';
                }
                html += SmartFilterEditor._generatePropertyTypeSelect(filter, i, smartFilter);
                html += SmartFilterEditor._generateChoiceSelect(filter, i, smartFilter);
                if (SF.SmartFilter.convertEnumConditionToString(filter.conditionType) != "exists" && SF.SmartFilter.convertEnumConditionToString(filter.conditionType) != "!exists") {
                    html += await SmartFilterEditor._generateInput(filter, i, smartFilter);
                }
                else {
                    html += '<div style="position:relative;left:5px;top:0px;width:275px"></div>';
                }
                html += '</div>';
                html += '</div>';
            }
        }
        html += '<button class="modelTreeSearchButton" type="button" style="margin-top:2px;left:2px;bottom:2px;position:relative;" onclick=\'SFUI.SmartFilterEditor._addFilterFromUI(false,' +  smartFilter.tempId + ')\'>Add Condition</button>';
        if (!smartFilterIn)
        {
            html += '<button class="modelTreeSearchButton" type="button" style="left:4px;bottom:2px;position:relative;" onclick=\'SFUI.SmartFilterEditor._addFilterFromUI(true,' +  smartFilter.tempId + ')\'>Add SubFilter</button>';
        }
        else
        {           
            html += '</div>';    
        }
        return html;
    }

}
