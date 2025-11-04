const gulp = require('gulp');
const concat = require('gulp-concat');
const minifyCSS = require('gulp-minify-css');
const replace = require('gulp-replace');
const sass = require('gulp-sass')(require('sass'));

gulp.task('style', () => {
  return gulp.src('dist/drawflow.min.css')
  .pipe(replace(/^(.*)$/, 'import {css} from "lit-element"; export const style = css`$1`;'))
  .pipe(concat('drawflow.style.js'))
  .pipe(gulp.dest('dist/'))
});

gulp.task('css', () => {
  return gulp.src('src/*.scss')
  .pipe(sass().on('error', sass.logError))
  .pipe(minifyCSS())
  .pipe(concat('drawflow.min.css'))
  .pipe(gulp.dest('dist/'))
});

gulp.task('default', gulp.series(
    'css', 
    'style'
  )
);
