import terser from '@rollup/plugin-terser';

export default {
	input: 'src/js/main.js',
	output: {
		file: 'dist/game.bundle.js',
		format: 'iife',
		name: 'Game',
		sourcemap: true
	},
	plugins: [
		terser()
	]
};
