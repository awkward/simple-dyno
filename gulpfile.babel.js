'use strict';

import gulp from 'gulp'
import browserify from 'browserify'
import babel from 'gulp-babel'
import replace from 'gulp-replace'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import uglify from 'gulp-uglify'
import del from 'del'

const paths = {
  scripts: ['src/**/*.js']
};

gulp.task('build', ['clean'], function() {
  return gulp.src(paths.scripts)
    .pipe(babel({
      presets: ['es2015', 'stage-0']
    }))
    .pipe(gulp.dest('lib'))
})

gulp.task('clean', function() {
  return del(['lib'])
})

gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['build'])
})

gulp.task('default', ['watch', 'build'])