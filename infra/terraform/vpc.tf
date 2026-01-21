## VPC for new EKS cluster
resource "aws_vpc" "eks_vpc" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name                                      = "fromprom-eks-vpc-tf"
    "kubernetes.io/cluster/fromprom-cluster-tf" = "shared"
    Environment                               = "production"
    Project                                   = "FromProm"
  }
}

## Public Subnets (2개, 각 가용영역)
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.eks_vpc.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = "ap-northeast-2a"
  map_public_ip_on_launch = true

  tags = {
    Name                                      = "fromprom-eks-public-2a"
    "kubernetes.io/cluster/fromprom-cluster-tf" = "shared"
    "kubernetes.io/role/elb"                  = "1"
    Environment                               = "production"
    Project                                   = "FromProm"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.eks_vpc.id
  cidr_block              = "10.20.2.0/24"
  availability_zone       = "ap-northeast-2c"
  map_public_ip_on_launch = true

  tags = {
    Name                                      = "fromprom-eks-public-2c"
    "kubernetes.io/cluster/fromprom-cluster-tf" = "shared"
    "kubernetes.io/role/elb"                  = "1"
    Environment                               = "production"
    Project                                   = "FromProm"
  }
}

## Private Subnets (2개, 각 가용영역)
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.eks_vpc.id
  cidr_block        = "10.20.11.0/24"
  availability_zone = "ap-northeast-2a"

  tags = {
    Name                                      = "fromprom-eks-private-2a"
    "kubernetes.io/cluster/fromprom-cluster-tf" = "shared"
    "kubernetes.io/role/internal-elb"         = "1"
    Environment                               = "production"
    Project                                   = "FromProm"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.eks_vpc.id
  cidr_block        = "10.20.12.0/24"
  availability_zone = "ap-northeast-2c"

  tags = {
    Name                                      = "fromprom-eks-private-2c"
    "kubernetes.io/cluster/fromprom-cluster-tf" = "shared"
    "kubernetes.io/role/internal-elb"         = "1"
    Environment                               = "production"
    Project                                   = "FromProm"
  }
}

## Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.eks_vpc.id

  tags = {
    Name        = "fromprom-eks-igw"
    Environment = "production"
    Project     = "FromProm"
  }
}

## Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "fromprom-eks-nat-eip"
    Environment = "production"
    Project     = "FromProm"
  }

  depends_on = [aws_internet_gateway.igw]
}

## NAT Gateway
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id

  tags = {
    Name        = "fromprom-eks-nat"
    Environment = "production"
    Project     = "FromProm"
  }

  depends_on = [aws_internet_gateway.igw]
}

## Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.eks_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name        = "fromprom-eks-public-rt"
    Environment = "production"
    Project     = "FromProm"
  }
}

## Route Table for Private Subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.eks_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name        = "fromprom-eks-private-rt"
    Environment = "production"
    Project     = "FromProm"
  }
}

## Route Table Associations - Public
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

## Route Table Associations - Private
resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}
