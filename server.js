
/* set up the static file server*/
var static = require('node-static');

var http = require('http');

var port = process.env.PORT;
var directory = __dirname + '/public';

if(typeof port == 'undefined' || !port){
	directory = './public';
	port = 8080;
}

var file = new static.Server(directory);

var app = http.createServer(
	function(request, response){
		request.addListener('end',
			function(){
				file.serve(request, response);
			}
		).resume();
	}
).listen(port);

console.log('The server is running');

/* set up the web socket server */

/*registry of socket ids and palayer info*/
var players = [];

var io = require('socket.io').listen(app);

io.sockets.on('connection',  function (socket){

		log('Client connection by '+socket.id);

		function log(){
			var array = ['*** Server Log Message: '];
			for (var i = 0; i < arguments.length; i++){
				array.push(arguments[i]);
				console.log(arguments[i]);
			}
			socket.emit('log', array);
			socket.broadcast.emit('log', array);
		}

		/* should display something like */
	/* { 'room':somesequence, 'username':theperson's username } */
	/* { 'result': 'success', 'room': some sequence, 'username': user, 'membership': total#} */

		socket.on('join_room', function (payload){
			log('join_room command'+JSON.stringify(payload));
			/*check that clinet sent a payload*/
			if (('undefined' === typeof payload) || !payload){
				var error_message = 'join_room had no payload, command aborted';
				log(error_message);
				socket.emit('join_room_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
			/*check payload has a room to join*/
			var room = payload.room;
			if (('undefined' === typeof room) || !room){
				var error_message = 'join_room didn\'t specify a room, command aborted';
				log(error_message);
				socket.emit('join_room_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
			/*check that a usernamen has been provided*/
			var username = payload.username;
			if (('undefined' === typeof username) || !username){
				var error_message = 'join_room didn\'t specify a username, command aborted';
				log(error_message);
				socket.emit('join_room_response', {
					result:'fail',
					message: error_message
				});
				return;
			}

			/*store the information about new player*/
			players[socket.id] = {};
			players[socket.id].username = username;
			players[socket.id].room = room;

			/*have the user join the room*/
			socket.join(room);
			/*get room object*/
			var roomObject = io.sockets.adapter.rooms[room];

			/*tell everyone that's already there that someone just joiend*/
			var numClients = roomObject.length;
			var success_data = {
															result: 'success',
															room: room,
															username: username,
															socket_id: socket.id,
															membership: numClients
															};
			io.in(room).emit('join_room_response', success_data);


			for(var socket_in_room in roomObject.sockets){
				var success_data = {
																result: 'success',
																room: room,
																username: players[socket_in_room].username,
																socket_id: socket_in_room,
																membership: numClients
																};
				socket.emit('join_room_response',success_data);
			}
			log('join_room success');

			if(room !== 'lobby'){
				send_game_update(socket,room,'initial update');
			}

		});

		socket.on('disconnect', function (){
			log('Client disconnected '+JSON.stringify(players[socket.id]));

			if('undefined' !== typeof players[socket.id] && players[socket.id]){
				var username = players[socket.id].username;
				var room = players[socket.id].room;
				var payload = {
												username: username,
												socket_id: socket.id
											};
				delete players[socket.id];
				io.in(room).emit('player_disconnected', payload);
			}

		});

		/* should display something like */
		/* { 'room':somesequence, 'username':theperson's username , 'message': the message to send} */
		/* { 'result': 'success', 'username': speaker, 'message': sent} */
		socket.on('send_message', function (payload){
			log('server received a command', 'send_message', payload);
			if (('undefined' === typeof payload) || !payload){
				var error_message = 'send_message had no payload, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}

			var room = payload.room;
			if (('undefined' === typeof room) || !room){
				var error_message = 'send_message didn\'t specify a room, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}

			var username = players[socket.id].username;
			if (('undefined' === typeof username) || !username){
				var error_message = 'send_message didn\'t specify a username, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}

			var message = payload.message;
			if (('undefined' === typeof message) || !message){
				var error_message = 'send_message didn\'t specify a message, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}

			var success_data = {
														result: 'success',
														room: room,
														username: username,
														message: message,
			};
			io.in(room).emit('send_message_response', success_data);
			log('Message sent to the room '+room+ ' by ' + username);
		});

		/* should display something like */

		/*invite command*/
		/* 'requested user: socket_id of person'*/

		/*invite_response*/
		/*result:success*/
		/*socket_id: of person being Invited*/

		/*result: fail*/
		/*message: failure message*/

		/*invited_response*/
		/*result:success*/
		/*socket_id: of person being Invited*/

		/*result: fail*/
		/*message: failure message*/
		socket.on('invite', function (payload){
			log('invite with '+JSON.stringify(payload));

			/*check to make sure a payload was senet*/
			if (('undefined' === typeof payload) || !payload){
				var error_message = 'invite had no payload, command aborted';
				log(error_message);
				socket.emit('invite_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
/*
			var room = payload.room;
			if (('undefined' === typeof room) || !room){
				var error_message = 'send_message didn\'t specify a room, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
			*/
			/*check that the message can be traced to a username*/
			var username = players[socket.id].username;
			if (('undefined' === typeof username) || !username){
				var error_message = 'invite can\'t identify who sent the message';
				log(error_message);
				socket.emit('invite_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var requested_user = payload.requested_user;
			if (('undefined' === typeof requested_user) || !requested_user){
				var error_message = 'invite didn\'t specify a requested_user, command aborted';
				log(error_message);
				socket.emit('invite_response', {
																					result:'fail',
																					message: error_message
																				});
				return;
			}

			var room = players[socket.id].room;
			var roomObject = io.sockets.adapter.rooms[room];
			/*make sure the user being invitved is in the room*/
			if (!roomObject.sockets.hasOwnProperty(requested_user)){
				var error_message = 'invite requested a user that wasn\'t in the room, command aborted';
				log(error_message);
				socket.emit('invite_response', {
																					result:'fail',
																					message: error_message
																				});
				return;
			}

			/*if everything is ok, respond to the inviter that it was successful*/
			var success_data = {
														result: 'success',
														socket_id:requested_user
													};

			socket.emit('invite_response', success_data);

			/*tell the invitee that they have been invited*/
			var success_data = {
														result: 'success',
														socket_id:socket.id
													};

			socket.to(requested_user).emit('invited', success_data);

			log('invite successful');
		});

		/* should display something like */

		/*uninvite command*/
		/* 'requested user: socket_id of person'*/

		/*invite_response*/
		/*result:success*/
		/*socket_id: of person being unInvited*/

		/*result: fail*/
		/*message: failure message*/

		/*uninvited_response*/
		/*result:success*/
		/*socket_id: of person being doing the unInviting*/

		/*result: fail*/
		/*message: failure message*/
		socket.on('uninvite', function (payload){
			log('uninvite with '+JSON.stringify(payload));

			/*check to make sure a payload was senet*/
			if (('undefined' === typeof payload) || !payload){
				var error_message = 'uninvite had no payload, command aborted';
				log(error_message);
				socket.emit('uninvite_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
/*
			var room = payload.room;
			if (('undefined' === typeof room) || !room){
				var error_message = 'send_message didn\'t specify a room, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
			*/
			/*check that the message can be traced to a username*/
			var username = players[socket.id].username;
			if (('undefined' === typeof username) || !username){
				var error_message = 'uninvite can\'t identify who sent the message';
				log(error_message);
				socket.emit('uninvite_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var requested_user = payload.requested_user;
			if (('undefined' === typeof requested_user) || !requested_user){
				var error_message = 'uninvite didn\'t specify a requested_user, command aborted';
				log(error_message);
				socket.emit('uninvite_response', {
																					result:'fail',
																					message: error_message
																				});
				return;
			}

			var room = players[socket.id].room;
			var roomObject = io.sockets.adapter.rooms[room];
			/*make sure the user being invitved is in the room*/
			if (!roomObject.sockets.hasOwnProperty(requested_user)){
				var error_message = 'invite requested a user that wasn\'t in the room, command aborted';
				log(error_message);
				socket.emit('invite_response', {
																					result:'fail',
																					message: error_message
																				});
				return;
			}

			/*if everything is ok, respond to the uninviter that it was successful*/
			var success_data = {
														result: 'success',
														socket_id:requested_user
													};

			socket.emit('uninvite_response', success_data);

			/*tell the uninvitee that they have been uninvited*/
			var success_data = {
														result: 'success',
														socket_id:socket.id
													};

			socket.to(requested_user).emit('uninvited', success_data);

			log('uninvite successful');
		});

		/* should display something like */

		/*gamestart command*/
		/* 'requested user: socket_id of person to play with'*/

		/*game start response*/
		/*result:success*/
		/*socket_id: of person you are playing with*/
		/*game id: id of session*/

		/*result: fail*/
		/*message: failure message*/

		socket.on('game_start', function (payload){
			log('game_start with '+JSON.stringify(payload));

			/*check to make sure a payload was senet*/
			if (('undefined' === typeof payload) || !payload){
				var error_message = 'game_start had no payload, command aborted';
				log(error_message);
				socket.emit('game_start_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
		/*
			var room = payload.room;
			if (('undefined' === typeof room) || !room){
				var error_message = 'send_message didn\'t specify a room, command aborted';
				log(error_message);
				socket.emit('send_message_response', {
					result:'fail',
					message: error_message
				});
				return;
			}
			*/
			/*check that the message can be traced to a username*/
			var username = players[socket.id].username;
			if (('undefined' === typeof username) || !username){
				var error_message = 'game_start can\'t identify who sent the message';
				log(error_message);
				socket.emit('game_start_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var requested_user = payload.requested_user;
			if (('undefined' === typeof requested_user) || !requested_user){
				var error_message = 'uninvite didn\'t specify a requested_user, command aborted';
				log(error_message);
				socket.emit('uninvite_response', {
																					result:'fail',
																					message: error_message
																				});
				return;
			}

			var room = players[socket.id].room;
			var roomObject = io.sockets.adapter.rooms[room];
			/*make sure the user being invitved is in the room*/
			if (!roomObject.sockets.hasOwnProperty(requested_user)){
				var error_message = 'game_start requested a user that wasn\'t in the room, command aborted';
				log(error_message);
				socket.emit('game_start_response', {
																					result:'fail',
																					message: error_message
																				});
				return;
			}

			/*if everything is ok, respond to the gamestarter that it was successful*/

			var game_id = Math.floor((1+Math.random())*0x10000).toString(16).substring(1);

			var success_data = {
														result: 'success',
														socket_id:requested_user,
														game_id: game_id
													};

			socket.emit('game_start_response', success_data);

			/*tell the other player that they can play*/
			var success_data = {
														result: 'success',
														socket_id:socket.id,
														game_id: game_id
													};

			socket.to(requested_user).emit('game_start_response', success_data);

			log('game_start successful');
		});

		/*play_toekn command*/
		/*row:0-7 Col: 0-7: color :wite/black */

		/*a success message will be followed by a gme update message*/
		/*play token response*/
			/*result:success*/
			/*result: fail*/
				/*message: failure message*/

		socket.on('play_token', function (payload){
			log('play_token with '+JSON.stringify(payload));

			/*check to make sure a payload was senet*/
			if (('undefined' === typeof payload) || !payload){
				var error_message = 'play_token had no payload, command aborted';
				log(error_message);
				socket.emit('play_token_response', {
					result:'fail',
					message: error_message
				});
				return;
			}

			/*chek that the player has previously registed */
			var player = players[socket.id];
			if (('undefined' === typeof player) || !player){
				var error_message = 'The server doesn\'t recognize you, try going back one screen.';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var username = players[socket.id].username;
			if (('undefined' === typeof username) || !username){
				var error_message = 'play_token can\'t identify who sent the message.';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var game_id = players[socket.id].room;
			if (('undefined' === typeof game_id) || !game_id){
				var error_message = 'play_token can\'t find your game board.';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var row = payload.row;
			if (('undefined' === typeof row) || row < 0 || row > 7){
				var error_message = 'play_token didn\'t specifcy a vaild row, command aborted';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var column = payload.column;
			if (('undefined' === typeof column) || column < 0 || column > 7){
				var error_message = 'play_token didn\'t specifcy a vaild column, command aborted';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var color = payload.color;
			if (('undefined' === typeof color) || !color || (color != 'white' && color != 'black')){
				var error_message = 'play_token didn\'t specifcy a vaild color, command aborted';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var game = games[game_id];
			if (('undefined' === typeof game) || !game){
				var error_message = 'play_token couldn\'t find your game board, command aborted';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			/*if the current attempat at playing a token is out of turn then error*/
			if(color !== game.whose_turn){
				var error_message = 'play_token message played out of turn';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			/*if the wrong socket is playing the color*/
			if(
					((game.whose_turn === 'white') && (game.player_white.socket != socket.id)) ||
					((game.whose_turn === 'black') && (game.player_black.socket != socket.id))
			){
				var error_message = 'play_token turn played by wrong player';
				log(error_message);
				socket.emit('play_token_response', {
																								result:'fail',
																								message: error_message
																							});
				return;
			}

			var success_data = {
													result: 'success'
			};

			socket.emit('play_token_response',success_data);

			/*execute the above*/
			if (color == 'white'){
				game.board[row][column] = 'w';
				flip_board('w',row,column,game.board);
				game.whose_turn = 'black';
				game.legal_moves = calculate_valid_moves('b',game.board);
			}
			else if(color == 'black'){
				game.board[row][column] = 'b';
				flip_board('b',row,column,game.board);
				game.whose_turn = 'white';
				game.legal_moves = calculate_valid_moves('w',game.board);
			}

			var d = new Date();
			game.last_move_time = d.getTime();

			send_game_update(socket,game_id,'played a token');
		});
});

/*******************************/
/*Code related to game state*/

var games =[];


function create_new_game(){
	var new_game ={};
	new_game.player_white ={};
	new_game.player_black ={};
	new_game.player_white.socket ='';
	new_game.player_white.username ='';
	new_game.player_black.socket ='';
	new_game.player_black.username ='';

	var d = new Date();
	new_game.last_move_time = d.getTime();

	new_game.whose_turn = 'black';

	new_game.board =[
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ','w','b',' ',' ',' '],
										[' ',' ',' ','b','w',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' ']
									];
new_game.legal_moves = calculate_valid_moves('b',new_game.board);

	return new_game;
}

/*check if there is a color who on the line starting at (r,c) or
anywhere further by adding dr and dc to (rc)*/

function check_line_match(who,dr,dc,r,c,board){
	if(board[r][c] === who){
		return true;
	}
	if(board[r][c] === ' '){
		return false;
	}
	if( (r+dr < 0) || (r+dr>7)){
		return false;
	}
	if( (c+dc < 0) || (c+dc>7)){
		return false;
	}
	return check_line_match(who,dr,dc,r+dr,c+dc,board);
}


/*check if the positicon at r,c continas the opposite of 'who' on the board and
if the y indicated by adding dr to r and dc to c eventually
ands in the who colro*/

function valid_move(who,dr,dc,r,c,board){
	var other;
	if (who ==='b'){
		other = 'w';
	}
	else if(who ==='w'){
		other = 'b';
	}
	else{
		log('Houston we have a color problem: '+who);
		return false;
	}
	if((r+dr < 0) || (r+dr>7)){
		return false;
	}
	if((c+dc < 0) || (c+dc>7)){
		return false;
	}
	if(board[r+dr][c+dc] != other){
		return false;
	}
	if((r+dr+dr < 0) || (r+dr+dr > 7)){
		return false;
	}
	if((c+dc+dc < 0) || (c+dc+dc > 7)){
		return false;
	}
	return check_line_match(who,dr,dc,r+dr+dr,c+dc+dc,board);
}

function calculate_valid_moves(who,board){
	var valid =[
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' '],
										[' ',' ',' ',' ',' ',' ',' ',' ']
									];
	for (var row = 0; row < 8; row++){
		for (var column = 0; column < 8; column++){
			if(board[row][column] === ' '){
				nw = valid_move(who,-1,-1,row,column,board);
				nn = valid_move(who,-1, 0,row,column,board);
				ne = valid_move(who,-1, 1,row,column,board);

				ww = valid_move(who, 0,-1,row,column,board);
				ee = valid_move(who, 0, 1,row,column,board);

				sw = valid_move(who, 1,-1,row,column,board);
				ss = valid_move(who, 1, 0,row,column,board);
				se = valid_move(who, 1, 1,row,column,board);

				if( nw || nn || ne ||ww ||ee || sw ||ss || se){
					valid[row][column] = who;
				}
			}
		}
	}
	return valid;
}

function flip_line(who,dr,dc,r,c,board){

	if((r+dr < 0) || (r+dr>7)){
		return false;
	}
	if((c+dc < 0) || (c+dc>7)){
		return false;
	}
	if(board[r+dr][c+dc] === ' '){
		return false;
	}
	if(board[r+dr][c+dc] === who){
		return true;
	}
	else{
		if(flip_line(who,dr,dc,r+dr,c+dc,board)){
			board[r+dr][c+dc] = who;
			return true;
		}
		else{
			return false;
		}
	}


}

function flip_board(who,row,column,board){
	flip_line(who,-1,-1,row,column,board);
	flip_line(who,-1, 0,row,column,board);
	flip_line(who,-1, 1,row,column,board);

	flip_line(who, 0,-1,row,column,board);
	flip_line(who, 0, 1,row,column,board);

	flip_line(who, 1,-1,row,column,board);
	flip_line(who, 1, 0,row,column,board);
	flip_line(who, 1, 1,row,column,board);
}

function send_game_update(socket, game_id, message){

	/*check to see if game with game id already exists*/
	if (('undefined' === typeof games[game_id])|| !games[game_id]){
		/*no game exists, so make one*/
		console.log('No game exists. Creating '+game_id+ ' for '+socket.id);
		games[game_id] = create_new_game();
	}
	/*make sure only two people are in the mage room*/

	var roomObject;
	var numClients;
	do{
			roomObject = io.sockets.adapter.rooms[game_id];
			numClients = roomObject.length;
			if (numClients > 2){
				console.log('Too many clients in room: '+game_id+' #: '+numClients);
				if (games[game_id].player_white.socket == roomObject.sockets[0]){
					games[game_id].player_white.socket = ' ';
					games[game_id].player_white.username = ' ';
				}
				if (games[game_id].player_black.socket == roomObject.sockets[0]){
					games[game_id].player_black.socket = ' ';
					games[game_id].player_black.username = ' ';
				}
				/*kick out the extra person*/
				var sacrifice = Object.keys(roomObject.sockets)[0];
				io.of('/').connected[sacrifice].leave(game_id);
			}
	}
	while((numClients-1) > 2);

	/*assign this socket a color white.black*/
	/*if current player isn;t assigned a color*/
	if((games[game_id].player_white.socket != socket.id)&& (games[game_id].player_black.socket != socket.id)){
		console.log('Player isn\'t assigned a color: '+socket.id);
		/*and if there isnt a color to give them*/
		if ((games[game_id].player_black.socket != '') && (games[game_id].player_white.socket != '')){
			games[game_id].player_white.socket = '';
			games[game_id].player_white.username = '';
			games[game_id].player_black.socket = '';
			games[game_id].player_black.username = '';
		}
	}
	/* assign colors to lpayers if not already done*/
	if (games[game_id].player_white.socket == ''){
		if (games[game_id].player_black.socket != socket.id){
			games[game_id].player_white.socket = socket.id;
			games[game_id].player_white.username = players[socket.id].username;
		}
	}
	if (games[game_id].player_black.socket == ''){
		if (games[game_id].player_white.socket != socket.id){
			games[game_id].player_black.socket = socket.id;
			games[game_id].player_black.username = players[socket.id].username;
		}
	}

	/*send game update*/
	var success_data ={
											result: 'success',
											game: games[game_id],
											message: message,
											game_id: game_id
	};
	io.in(game_id).emit('game_update', success_data);
	/*check to see if game is over*/

	var row,column;
	var count = 0;
	var black = 0;
	var white = 0;
	for (row = 0; row < 8; row++){
		for (column = 0; column < 8; column++){
			if(games[game_id].legal_moves[row][column] != ' '){
				count++;
			}
			if(games[game_id].board[row][column] === 'b'){
				black++;
			}
			if(games[game_id].board[row][column] === 'w'){
				white++;
			}
		}
	}
	if (count == 0){
		/*send a game over message*/
		var winner = 'tie game';
		if (black > white){
			winner = 'black';
		}
		if (white > black){
			winner = 'white';
		}
		var success_data = {
														result: 'success',
														game: games[game_id],
														who_won: winner,
														game_id: game_id
														};
		io.in(game_id).emit('game_over', success_data);

		/*Delete old games after 1 hour*/
		setTimeout(function(id){
			return function(){
				delete games[id];
			}}(game_id)
			,60*60*1000);
	}
}
