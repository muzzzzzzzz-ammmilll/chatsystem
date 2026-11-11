import { io } from 'socket.io-client';
import config from '../config';

const socket = io(config.apiUrl || '/');
export default socket;
