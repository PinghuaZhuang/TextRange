import { debounce } from 'lodash';

console.log([1, 2].at(-1));
export default debounce(console.log, 300);
