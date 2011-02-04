/*
    jNag, mobile interface for the Nagios network monitoring server
    Copyright (C) 2011  Paul Berry

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
    
    Contact the author: tall_paulb@hotmail.com
                        tall-paul.co.uk

*/

var data_url;
var problem_count = 0;
var global_poll_time = 5000;
var username;
var password;
var cmd_url = "";
var pnp_url = "";
var current_type = "";
var current_variable = "";
var cors = true;
var use_https = false;

jQuery.fn.checked = function(){
         return jQuery(this).is(':checked');
}

function now(){
  return Math.round(new Date().getTime() / 1000);
}

function randomNum(){
    return Math.floor(Math.random()*100001);
}


//data getting functions
function count_problems(repeat){
  if (cors == true){
      $.ajax({
            data: "count_problems=true&rand="+randomNum(),
            success: function(data){
                        counted_problems(data);                                  
            }
      });
      if (repeat == true){
         setTimeout("count_problems(true);",global_poll_time);
      }
  } else {
    $.getJSON(build_url()+"&count_problems=true&callback=?",
    function(data){
         counted_problems(data);
         if (repeat == true){
          setTimeout("count_problems(true);",global_poll_time);
        }
    }); 
   }
}

function load_problems(){
   if (cors == true){
      $.ajax({
            data: "load_problems=true&rand="+randomNum(),
            success: function(data){
                        populate_problems(data);                   
                    }
      });
   } else {
    $.getJSON(build_url()+"&load_problems=true&callback=?",
    function(data){
        populate_problems(data);             
    });    
   }
}

function browse(type,variable){  
  $.mobile.pageLoading();
  var pagename = "browse_"+type;
  if (cors == true){
   $.ajax({
            data: "browse=true&type="+type+"&variable="+variable+"&rand="+randomNum(),
            success: function(data){
                        element_builder(data);
                        current_type = type;  
                        current_variable = variable;          
                    }
      });         
   } else {
   $.getJSON(build_url()+"&browse=true&type="+type+"&variable="+variable+"&callback=?",
   function(data){
      element_builder(data);
      current_type = type;  
        current_variable = variable;
   });
   }
}



function counted_problems(data){    
    last_count = problem_count;    
        problem_count = data.problem_count;
        $('.problem_count').each(function(i){
            $(this).html(problem_count);
        });        
        if (problem_count > 0 || last_count != problem_count){
            load_problems();
            $('.problem_pulser').removeClass("pulseon").addClass("pulseon");            
        }  else {
            $('.problem_pulser').removeClass("pulseoff").addClass("pulseoff");
            $('#problem_list').html("No Problems Detected");            
        }              
}


function populate_problems(data){
   $('#problem_list').html("");
        var out = "<div id='problems_ajax'>";        
        $.each(data.problems, function(key,value){
             var output = "";  
             if (value.type == "none"){
                out += "No Problems detected";
             } else {            
                if (value.type == "host"){
                   output = value.host+" Problem "+value.plugin_output;
                    browse_string = "browse('acknowledge_host','host|"+value.host+"');";
                  } else {
                    output = value.service+" on "+value.host+" "+value.plugin_output;
                    browse_string = "browse('acknowledge_service','host|"+value.host+"|service|"+value.service+"');";
                }
                               
                out += '<a data-icon="alert" data-iconpos="right" href="#" data-role="button" data-theme="e" class="ajax" onClick="'+browse_string+'" >'+output+'</a>';
             }                           
        });
        out += "</div>";
        $('#problem_list').append(out);
        $('#problems_ajax').page();
}


function cmd(form_id){
    $.post(cmd_url, $("#"+form_id).serialize());
}

function home(){
   parent.location.hash = '';
   window.location.href=window.location.href.slice(0, -1);   
}

function refresh_page(){
    if (current_type == "")
        current_type = "top";    
    if (current_type == "top"){
        window.location.hash = "";
        window.location.reload(true);          
    }  else {
      $.mobile.changePage("#dummy_page","",false,false);
      browse(current_type,current_variable);
    }
}


function create_browse_page(page_name,title,display_problems){
    $('#browse_'+page_name).page("destroy");
    $('#browse_'+page_name).remove();
    if (display_problems == true){
      problems_string = '<ul data-role="listview" data-inset="true" data-theme="c"><li class="problem_pulser"><a href="#problems_page">Problems</a><div class="ui-li-count problem_count"></div></li></ul>';
    } else {
      problems_string = '';
    }
    //with footer
    pagestring = '<div data-role="page" id="browse_'+page_name+'"><div data-role="header" data-position="fixed"><h1>'+title+'</h1></div><div data-role="content">'+problems_string+'<div id="'+page_name+'_target"></div></div><div data-role="content"></div><div data-role="footer" data-position="fixed"> <div data-role="controlgroup" data-type="horizontal"><a href="#" onClick="home();" data-transition="pop" data-icon="grid" class="ui-btn-right">Home</a><a href="#config_page" data-rel="dialog" data-transition="pop" data-icon="gear" class="ui-btn-right">Options</a><a href="#" data-transition="pop" data-icon="refresh" onClick="refresh_page();" class="ui-btn-right">refresh</a></div></div></div>';
    //without footer
    //pagestring = '<div data-role="page" id="browse_'+page_name+'"><div data-role="header" data-position="fixed"><h1>'+title+'</h1></div><div data-role="content">'+problems_string+'<div id="'+page_name+'_target"></div></div><div data-role="content"></div></div>';               
    $('body').append(pagestring);
    
}

function create_generic_dialog(page_name, title){
    $('#'+page_name).page("destroy");
    $('#'+page_name).remove();
    pagestring =  '<div data-role="dialog" id="'+page_name+'"><div data-role="header" data-position="fixed"><h1>'+title+'</h1></div><div data-role="content" id="'+page_name+'_target"></div></div>';
    $('body').append(pagestring);    
}

function element_builder(data){
    var refresh = new Array();
      $.each(data.browse_items, function(key, value){              
        var count = value.count;
        if (count > -1){
             count = "<div class='ui-li-count'>"+count+"</div>";
        } else {
             count = "";
        }
        var colour = "";
        if (value.colour == "warn"){
           colour = " class='ui-btn-up-e' "; 
        }
        switch (value.type){
            case  "create_page": //create a new browse page
                  create_browse_page(value.id,value.title,true);                  
                  var this_refresh = {};
                   this_refresh.type = "page";
                   this_refresh.id = "browse_"+value.id;             
                   refresh.push(this_refresh);
                  break;     
            case "create_dialog":
                  create_generic_dialog(value.id, value.title);
                  var this_refresh = {};
                   this_refresh.type = "dialog";
                   this_refresh.id = value.id;             
                   refresh.push(this_refresh);
                  break;             
            case  "clear": //clear a div               
                 $('#'+value.target).html("");
                 break;                          
             case "pnp":
                image_width = window.innerWidth * 0.90;
                outstring = "<div><img class='pnp' src='"+pnp_url+"?host="+value.host+"&srv="+value.service+"&source=1&view="+value.pnp_view+"&end="+now()+"&display=image' width='"+image_width+"'/></div>";
                $("#"+value.target).append(outstring);
                break;
             case "form": //create a form
                outstring = '<form id="'+value.id+'"></form>';
                $("#"+value.target).append(outstring);
                break;
             case "input_hidden":
                outstring = '<input type="hidden" name="'+value.id+'" id="'+value.id+'" value="'+value.val+'" />';
                $("#"+value.target).append(outstring);
                break; 
             case "input_text":
                outstring = '<div data-role="fieldcontain"><label for="'+value.id+'">'+value.text+'</label><input type="text" name="'+value.id+'" id="'+value.id+'" value="'+value.val+'"/></div>';
                $("#"+value.target).append(outstring);
                break;  
             case "cmd_button":
                 cmdstring = "cmd('"+value.id+"');";
                 outstring = '<a href="#" onClick="'+cmdstring+'" data-role="button">Commit</a>';  
                 $("#"+value.target).append(outstring);
                 break;          
             case  "list": //create a listview, requires 'id' in the data
                outstring = '<ul data-role="listview" data-inset="true" data-theme="c" id="'+value.id+'"></ul>'; 
                var this_refresh = {};
                   this_refresh.type = "listview";
                   this_refresh.id = value.id;             
                   refresh.push(this_refresh);               
               $("#"+value.target).append(outstring);               
               break;
             case  "nolink": //list item with no link, requires 'text' in data
               outstring = '<li'+colour+'>'+value.text+'</li>';
               $("#"+value.target).append(outstring);
               break;
             case "header": //listview heading, requires 'text' in data
               outstring = '<li data-role="list-divider">'+value.text+'</li>';
               $("#"+value.target).append(outstring);
               break;
             case "text": //a block of text under a header.  requires 'heading' and 'text' in data
               outstring = '<div data-role="fieldcontain"><h3>'+value.heading+'</h3><p>'+value.text+'</p></div>';
               $("#"+value.target).append(outstring);
               break;   
             case "replace": //replace content of a DOM element with a returned string, requires 'id' and 'text' in data
                $('#'+value.id).html(value.text);
                break;
             case "browse_button":
                 browsestring = "browse('"+value.button_type+"','"+value.button_variable+"');";
                 outstring = '<a href="#" onClick="'+browsestring+'" data-role="button">'+value.button_text+'</a>';  
                 $("#"+value.target).append(outstring);
                 break;
             default:
               //default is a list item, with a link to the next browse page, requires 'variable', 'count' and 'text' in data 
               browsestring = "browse('"+value.type+"','"+value.variable+"');";
               if (value.image != "" && value.image != null)
                  imagestring = "<img class='ui-li-thumb' src='"+value.image+"' />";
               else 
                  imagestring = "";
               if (value.heading != "" && value.heading != null)
                  textstring = "<h3>"+value.heading+"</h3><p>"+value.text+"<p>";
               else
                  textstring = "<h3>"+value.text+"</h3>";
               outstring = '<li'+colour+'>'+imagestring+'<a href="#" onClick="'+browsestring+'">'+textstring+'</a>'+count+'</li>';
               $("#"+value.target).append(outstring);         
        }                                        
      });       
      $.each(refresh, function(key, value){
          switch (value.type){
              case "listview":
                 $('#'+value.id).listview();
                 break;
              case "dialog":
                 $('#'+value.id).page();
                 $.mobile.changePage("#"+value.id,"pop",false,false);
                 break; 
              case "page":
                $('#'+value.id).page();
                count_problems(false);                
                $.mobile.changePage("#"+value.id,"slide",false,true);
          }
      });
       //remove any broken graph images
       $('.pnp').error(function() {
           $(this).parent().prev().remove();
	         $(this).parent().remove();
        });
       $.mobile.pageLoading(true);
}




function pulser(){
          if ($('.pulseon').hasClass("ui-btn-up-e")){
             $('.pulseon').removeClass("ui-btn-up-e").addClass("ui-btn-up-a"); 
          } else {
             $('.pulseon').removeClass("ui-btn-up-a").addClass("ui-btn-up-e");
          }
          $('.pulseoff').removeClass("pulseon").removeClass("pulseoff").removeClass("ui-btn-up-a");
}          
        
function jNag_polling(poll_time){
            $('.problem_list').show();            
            global_poll_time = poll_time;                        
            setTimeout("count_problems(true)",100);
            setInterval("pulser()",1000);                                    
            setTimeout("browse('top','')",100);          
        }        

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function build_url(){
    if (use_https == true)
      return "https://"+username+":"+password+"@"+data_url+"?a=1";
    else
      return "http://"+username+":"+password+"@"+data_url+"?a=1";    
}

function setAjax(){
   if (use_https == true){
      transport = "https://";
   } else {
      transport = "http://";
   }
   $.ajaxSetup({
         url: transport+data_url,
         username: username,
         password: password,
         type: "GET",
         datatype: "json"
    });
}


function jnag_init(){
    setAjax();
    if (data_url == null || data_url == ""){
        $.mobile.changePage("#config_page", "pop", false, false); 
    } else {         
      if (cors == true){
         $.ajax({
            data: "settings=true&rand="+randomNum(),
            success: function(data){
                        cmd_url = data.settings.cmd_url;
                        pnp_url = data.settings.pnp_url;
                        jNag_polling(5000);          
            },
            error: function(){                
               alert("Unable to connect, check your settings!");               
            }
         });
      } else {
        $.getJSON(build_url()+"&settings=true&callback=?",
        function(data){           
           cmd_url = data.settings.cmd_url;
           pnp_url = data.settings.pnp_url;
           jNag_polling(5000);                     
        });     
      }  
    }
}

function open_config(){
      $.mobile.changePage("#config_page", "pop", false, false);
}

function load_config(){  
    data_url = window.localStorage.getItem("data_url");
    username = window.localStorage.getItem("username");
    password = window.localStorage.getItem("password");
    if (window.localStorage.getItem("use_https") == "true"){
          use_https = true;
    } else {
          use_https = false;
    }       
    $('#data_url').val(data_url);   
    $('#username').val(username);
    $('#password').val(password);    
    $('#use_https').attr('checked', use_https);
    jnag_init();
}

function save_config(){  
   data_url = $('#data_url').val();
   username = $('#username').val();
   password = $('#password').val();   
   window.localStorage.setItem("data_url",data_url);
   window.localStorage.setItem("username",username);
   window.localStorage.setItem("password",password);
   if ($('#use_https').checked()){
      use_https = true;
      window.localStorage.setItem("use_https","true");
   } else {
      use_https = false;
      window.localStorage.setItem("use_https","false");
   }
   jnag_init();
}     

$(document).ready(function(){
    load_config();
});

