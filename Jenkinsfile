pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code....'
                checkout scm
            }
        }

      stage('Install Dependencies') {
        steps {
            echo 'Installing dependencies...'
            sh 'npm ci'
        }
      }
      stage('Verify') {
        steps {
            echo 'Verifying Node environment...'
            sh 'node --version'
            sh 'npm --version'
        }
      }
    //   stage('Lint') {
    //     steps {
    //         echo 'Runninglint...'
    //         sh 'npm test'
    //     }
    //   }

    //   stage('Build'){
    //     steps{
    //         echo 'Building applications...'
    //         sh 'npm run build'
    //     }
    //   }
    }
    post {
        success {
            echo 'CI pipeline completed sucessfully!'
        }
        failure {
            echo 'Ci pipeline failed!'
        }
        always {
            echo 'Pipeline finished.'
        }
    }
}