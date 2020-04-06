
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
			log('join_room_success');
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

});
